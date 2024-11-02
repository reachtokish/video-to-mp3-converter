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
const fs = require('fs');

const app = express();
const port = 9000;

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Mongo URI
const mongoURI = 'mongodb://localhost:27018/mongouploads';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs, gridfsBucket;

conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });

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

  console.log('req.file', req.file)

  amqp.connect("amqp://guest:guest@127.0.0.1", (err, connection) => {
    if (err) {
      throw err;
    }

    connection.createChannel((err, channel) => {
      if (err) {
        throw err;
      }
      let queueName = "video";
      
      let message = JSON.stringify({
        status: 'success',
        fileName: req.file.filename
      });

      channel.sendToQueue(queueName, Buffer.from(message));
      console.log(`Message: ${message}`);
      setTimeout(() => {
        connection.close();
      }, 1000);
    });
  });

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

app.get('/download-file/:filename', async (req, res) => {
  try {
    let file = await gfs.files.findOne({ filename: req.params.filename });
    
    let downloadStream = gridfsBucket.openDownloadStream(file._id)
    downloadStream.pipe(res)
  } catch (err) {
    console.log('err', err)
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

app.delete("/delete-all-files", async (req, res) => {
  try {
      await gridfsBucket.drop();
      res.json({ message: "All file and chunks deleted" })
  } catch (err) {
    console.log('err', err)
      res.json({err})
  }
});

app.listen(port, () => {
  console.log(`Api gateway running on port ${port}`);
});
