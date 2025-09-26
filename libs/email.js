var nodemailer = require('nodemailer');
var secretConfig = require('../secret-config');

function sendEmail(text) {
  var transport = nodemailer.createTransport({
    host: secretConfig.SMTP_HOST,
    port: secretConfig.SMTP_PORT,
    auth: {
      user: secretConfig.SMTP_EMAIL,
      pass: secretConfig.SMTP_PASSWORD
    }
  });

  var mailOptions = {
    from: secretConfig.SMTP_EMAIL,
    to: secretConfig.RECIPIENT_EMAIL,
    subject: "Message From Utopia GPT",
    html: text
  };

  transport.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 
}

module.exports = {
    sendEmail,
    default: {
        sendEmail
    }
}