const amqp = require('amqplib/callback_api');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs')
const Grid = require('gridfs-stream');
const mongoose = require('mongoose');

// Middleware
ffmpeg.setFfmpegPath(ffmpegPath);
// app.use(bodyParser.json());
// app.use(methodOverride('_method'));

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

function convert(input, output, callback) {
  ffmpeg(input)
    .output(output)
    .on("end", function () {
      console.log("conversion ended");
      callback(null);
    })
    .on("error", function (err) {
      console.log("error: ", err);
      callback(err);
    })
    .run();
}

amqp.connect('amqp://guest:guest@127.0.0.1', (err, connection) => {
  if (err) {
    throw err
  }

  connection.createChannel(async (err, channel) => {
    if (err) {
      throw err;
    }
    let videoQueue = "video";
    let notificationQueue = "notification";

    channel.consume(videoQueue, async (msg) => {
      console.log("Received: ", JSON.parse(msg.content.toString()).fileName)
      let file = await gfs.files.findOne({ filename: JSON.parse(msg.content.toString()).fileName });
      console.log('file', file)

      await gridfsBucket
        .openDownloadStream(file._id)
        .pipe(fs.createWriteStream(`./video/${file.filename}`));

      convert(`./video/${file.filename}`, `./audio/${file.filename.split('.')[0]}.mp3`, async (err) => {
        if (!err) {
          console.log("conversion complete");

          await fs.createReadStream(`./audio/${file.filename.split('.')[0]}.mp3`)
            .pipe(gridfsBucket.openUploadStream(`${file.filename.split('.')[0]}.mp3`));
          console.log("mp3 file uploaded");

          // setTimeout(async () => {
          //   await fs.unlink(`./video/${file.filename}`);
          //   await fs.unlink(`./audio/${file.filename.split('.')[0]}.mp3`);
          //   console.log("files deleted from local disk");
          // }, 4000)

          channel.sendToQueue(notificationQueue, Buffer.from(JSON.stringify({ "status": "success", fileName: `${file.filename.split('.')[0]}.mp3`})));
          console.log("notification sent");
        }
      });
      channel.ack(msg)
    })
  })
})
