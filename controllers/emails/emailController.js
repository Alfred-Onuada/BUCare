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

// initialize nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  secure: true,
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL,
    clientId: process.env.EMAIL_CLIENT_ID,
    clientSecret: process.env.EMAIL_CLIENT_SECRET,
    refreshToken: process.env.EMAIL_REFRESH_TOKEN,
    accessToken: process.env.EMAIL_ACCESS_TOKEN,
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
  console.log(`Request made to : ${req.url}`);

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
        console.log(err.message);
        return res.status(500).send("Something went wrong");
      })

    await TempUsers(data).save((err, data) => {
      if (err) {
        throw err;
      } else {
        // setting up the options for this email
        let mailOptions = {
          from: `Alfred at BUCare`,
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
            console.log(err);
            return res.status(500).send('failed');
          } 

          res.status(200).send('success');
        })
      }
    })

  } catch (error) {
    console.log(error.message);
    return res.status(500).send();
  }

})

module.exports = Router;