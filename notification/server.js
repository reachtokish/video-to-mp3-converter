const amqp = require("amqplib/callback_api");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
      user: 'johnathan.balistreri@ethereal.email',
      pass: 'R5mwHyrrNepW9NAF4V'
  }
});

amqp.connect('amqp://guest:guest@127.0.0.1', (err, connection) => {
  if (err) {
    throw err
  }

  connection.createChannel((err, channel) => {
    if (err) {
      throw err;
    }
    let notificationQueue = "notification";

    channel.consume(notificationQueue, (msg) => {
      console.log("Received: ", msg.content.toString());
      const queueContent = JSON.parse(msg.content.toString());

      var mailOptions = {
        from: 'patra.kishore61@gmail.com',
        to: 'patra.kishore65@gmail.com',
        subject: 'Your converted audio is ready to download',
        html: `
          <!DOCTYPE html>
          <html>
            <body>
              <h3>Thanks for using video to mp3 converter. Please download the mp3 file clicking on the below link</h3>
              <a href="${process.env.GATEWAY_SERVICE_ENDPOINT}/download-file/${queueContent.fileName}" target='_blank'>Download file</a>
            </body>
          </html>
        `
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ');
          console.log(info)
        }
      });

      channel.ack(msg)
    })
  })
})
