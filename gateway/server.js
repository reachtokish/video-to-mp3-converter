const express = require("express");
const amqp = require('amqplib/callback_api')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');

const app = express();
const port = 9000;

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb://localhost:27018/mongouploads';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

app.post('/convert', upload.single('file'), (req, res) => {
  res.json({ file: req.file });
});

app.get("/files", async (req, res) => {
  try {
      let files = await gfs.files.find().toArray();
      res.json({files})
  } catch (err) {
      res.json({err})
  }
});

app.get('/files/:filename', async (req, res) => {
  try {
    let file = await gfs.files.findOne({ filename: req.params.filename });
    res.json({ file })
  } catch (err) {
      res.json({err})
  }
});

app.delete('/del-file/:filename', async (req, res) => {
  try {
    let file = await gfs.files.findOne({ filename: req.params.filename });

    if (file) {
      const gsfb = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
      await gsfb.delete(file._id)
      res.json({ message: "File deleted!" })
    } else {
      res.json({ message: "File not found" })
    }
  } catch (err) {
    res.json({err})
  }
});

app.listen(port, () => {
  console.log(`Api gateway running on port ${port}`);
});
