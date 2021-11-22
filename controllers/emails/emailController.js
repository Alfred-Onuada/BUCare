// This route controller controls every request to send an email across the entire application
const Router = require('express').Router();

//  for credentials
const env = require('dotenv').config();

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
transporter.use('compile', hbs(handlebarOptions))

Router.post('/registration', (req, res) => {

  console.log(`Request made to : ${req.url}`);

  // setting up the options for this email
	let mailOptions = {
		from: `Alfred at BUCare`,
		to: req.body.email,
		subject: 'Confirm Email Address',
		template: 'registration',
		context: {
			token: req.body.token,
      website_url: req.body.website_url
		}
	};

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
      return res.status(500).send('failed');
    }

    console.log('success');
    res.status(200).send('success');
  })

})

module.exports = Router;