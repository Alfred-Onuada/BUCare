// This route controller controls every request to send an email across the entire application
const Router = require('express').Router();

//  for credentials
const env = require('dotenv').config();

// db models
const TempUsers = require('./../../models/tempUser');

// hapi is used for validation
const Joi = require("@hapi/joi");

// package for generating tokens
const crypto = require('crypto');

// packages to handle emails
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

// package for generating pdf
const PDFDocument = require('pdfkit-table');
const fs = require('fs')

// initialize nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
		secure: true,
		auth: {
			type: 'OAuth2',
			user: process.env.EMAIL,
			clientId: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			refreshToken: process.env.REFRESH_TOKEN,
			accessToken: process.env.ACCESS_TOKEN,
		},
		tls: {
			rejectUnauthorized: false
		}
});

// point to the template folder for email template
const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve(__dirname + '/templates/'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname + '/templates/'),
};

// use template file with nodemailer
transporter.use('compile', hbs(handlebarOptions));

const tempUserSchema = Joi.object({
  Email: Joi.string()
    .pattern(/(\d{4}@student.babcock.edu.ng|@babcock.edu.ng)$/i) 
    .required(),
  Unique_Code: Joi.string().min(6).max(6).required(),
  Expires_In: Joi.number().required()
})

Router.post('/registration', async (req, res) => {
  // this produces exactly six random characters
  const token = crypto.randomBytes(3).toString('hex');
  const expirationDate = new Date().getTime() + 600000; // this adds a ten minute expiration

  const data = {
    Email: req.body.Email,
    Unique_Code: token,
    Expires_In: expirationDate
  }

  try {
    
    await tempUserSchema.validateAsync(data);

    // this makes sure to delete old data from the system
    await TempUsers.findOneAndDelete({ Email: data.Email })
      .catch(err => {
        console.error(err.message);
        return res.status(500).send("Something went wrong");
      })

    await TempUsers(data).save((err, data) => {
      if (err) {
        throw err;
      } else {
        // setting up the options for this email
        let mailOptions = {
          from: `"BUCare Info" <noreply@bucare.com.ng>`,
          to: req.body.Email,
          subject: 'Confirm Email Address',
          template: 'registration',
          context: {
            token,
            website_url: req.body.Website_Url
          }
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error("error: ", err.message);
            return res.status(500).send('failed');
          } 

          console.log("success: ",info)
          return res.status(200).send('success');
        })
      }
    })

  } catch (error) {
    console.error(error.message);
    return res.status(400).send();
  }

})

// send email to info user that password has changed
const sendPasswordHasChangedEmail = function(email, websiteUrl) {
  return new Promise(async (resolve, reject) => {

    try {
      // setting up the options for this email
      let mailOptions = {
        from: `noreply@bucare.com.ng`,
        to: email,
        subject: 'Password Change Alert',
        template: 'passwordHasChanged',
        context: {
          websiteUrl
        }
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err.message);
          reject({status: 500, message: 'Something went wrong while sending mail. try again later'});
        } 

        resolve({status: 200, message: "Success"});
      })
    } catch (error) {
      console.error(error.message);
      reject({status: 500, message: "Something went wrong"});
    }
  })
}

// send the password token for forgot password
const sendResetEmail = function(email, websiteUrl) {
  return new Promise(async (resolve, reject) => {
    // this produces exactly six random characters
    const token = crypto.randomBytes(3).toString('hex');
    const expirationDate = new Date().getTime() + 600000; // this adds a ten minute expiration

    const data = {
      Email: email,
      Unique_Code: token,
      Expires_In: expirationDate
    }

    try {
      
      await tempUserSchema.validateAsync(data);

      // this makes sure to delete old data from the system
      await TempUsers.findOneAndDelete({ Email: data.Email })
        .catch(err => {
          console.error(err.message);
          reject({status: 500, message: "Something went wrong"});
        })

      await TempUsers(data).save((err, data) => {
        if (err) {
          throw err;
        } else {
          // setting up the options for this email
          let mailOptions = {
            from: `noreply@bucare.com.ng`,
            to: email,
            subject: 'Reset Password Request',
            template: 'resetPassword',
            context: {
              token,
              websiteUrl
            }
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error(err.message);
              reject({status: 500, message: 'Something went wrong while sending mail. try again later'});
            } 

            resolve({status: 200, message: "Success"});
          })
        }
      })

    } catch (error) {
      console.error(error.message);
      reject({status: 500, message: "Something went wrong"});
    }
  })
}


function generateHeader(document) {
  document.font("Helvetica")
    .fontSize(15)
		.text('BUCare, Babcock University')
		.fontSize(10)
    .moveUp(2)
		.text('121103, Ilishan-Remo', { align: 'right' })
		.text('Ogun State, Nigeria', { align: 'right' })
    .text("www.bucare.herokuapp.com", {
      link: "www.bucare.herokuapp.com",
      align: 'right'
    })
    .moveDown();
}

function generateFooter(document) {
  document.font("Helvetica")
    .fontSize(10)
    .text(`Copyright © ${new Date(Date.now()).getFullYear()} Babcock University`, { align: 'center', width: 500 });
}

function generateIntroText(document, data) {

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const d = new Date();

  let year = d.getFullYear();
  let month = months[d.getMonth()];
  let day = days[d.getDay()];

  document.font("Helvetica")
    .fontSize(12) 
    .text(`${day + ", " + d.getDate() + " " + month + " " + year}`)
    .moveDown()
    // should contain the name of the admin that generated it
    .text(`Hello ${data.adminName},`)
    .moveDown()
    .text(
      `
      This document provides information about ${data.clientName} as gotten from ${data.therapistName} on ${data.dateFormatted}.
      The contents of this document was automatically generated upon your request and should not be modified manually, Thank you.`
    )
    .moveDown()
}

async function generateReportTable(document, data) {
  await document.table(data.table, {
    prepareHeader: () => document.font("Helvetica-Bold").fontSize(12),
    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
      document.font("Helvetica").fontSize(12)
    }
  })
}

const sendReportAsEmail = function (data, fileName, recieverEmail, websiteUrl) {
  return new Promise(async (resolve, reject) => {

    try {
      let doc = new PDFDocument({ margin: 50 });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const d = new Date();
      
        let year = d.getFullYear();
        let month = months[d.getMonth()];
        let day = days[d.getDay()];

        let pdfData = Buffer.concat(buffers);

        if (pdfData) { 
          // setting up the options for this email
          let mailOptions = {
            from: `noreply@bucare.com.ng`,
            to: recieverEmail,
            subject: `Automatic Counselling Report Generated on ${day + ", " + d.getDate() + " " + month + " " + year}`,
            template: 'report',
            attachments: [
              {
                filename: fileName,
                content: pdfData
              }
            ],
            context: {
              websiteUrl,
              adminName: pdfData.adminName
            }
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error(err);
              return reject({status: 500, message: 'Something went wrong while sending mail. try again later'});
            } 

            // if the code gets here it was succesful
            return resolve({ status: 200, message: `Successfully created ${fileName}`});

          })
        }
      });

      generateHeader(doc);
      generateIntroText(doc, data);
      await generateReportTable(doc, data);
      generateFooter(doc);

      doc.end();

    } catch (err) {
      console.error(err.message);
      return resolve({ status: 500, message: `A server error occured, most likely because of the pdf creation`});
    }  
  })
}

module.exports = { 
  Router, 
  sendResetEmail,
  sendPasswordHasChangedEmail,
  sendReportAsEmail
};
