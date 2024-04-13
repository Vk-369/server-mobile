const nodemailer = require("nodemailer");

const sendMails = (mailData) => {
  let sender = nodemailer.createTransport({
    host: process.env.MAIL_SERVICE,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SENDER_MAIL,
      pass: process.env.SENDER_PASSWORD,
    },
  });

  let receiver = {
    from: process.env.SENDER_MAIL,
    to: mailData.receiver,
    subject: mailData.subject,
    text: mailData.content,
  };

  sender.sendMail(receiver, (error, resp) => {
    if (error) {
      return console.log(error);
    }
    console.log("email sent", resp);
  });
};

module.exports = sendMails;
