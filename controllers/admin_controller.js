const Users = require('./../models/user');
const Therapist = require('./../models/therapist');
const Client = require('./../models/client');
const Admin = require('./../models/admin');

// Initialize Packages
const Router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// hapi jo helps carry out input validation
const Joi = require('@hapi/joi');

// verification route
const verify = require('./auths/verify');

// creating a register schema with Hapi Joi
const therapistRegisterSchema = Joi.object({
    First_Name: Joi.string().min(2).required(),
    Last_Name: Joi.string().min(2).required(),
    Email: Joi.string().min(6).required().email(),
    Telephone: Joi.string().min(6).required(),
    Password: Joi.string().min(8).required(),
    Sex: Joi.string().required(),
    Specialization: Joi.array().required(),
    Unique_Code: Joi.string()
});

Router.post('/register', async (req, res) => {

    // it uses an async function because of the encrytion processes it has
    Users.findOne({ Email: req.body.Email })
        .then(async (docs) => {

            if (docs != null) {
                return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
            }

            // transform the specialization sentence into array
            req.body.Specialization = req.body.Specialization.split(', ');

            // this is a try catch because this process might fail
            try {

                // Now verify user input using hapi/joi
                const { error } = await therapistRegisterSchema.validateAsync(req.body);

                if (error) {
                    return res.status(400).send(error.details[0].message); // AJAX will inteprete the result and find what fields on the form has an issue
                } else {
                    
                    // hashing the password
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(req.body.Password, salt);

                    // change the password that is stored in db
                    req.body.Password = hashedPassword;

                    // generate random code for user
                    req.body.Unique_Code = crypto.randomBytes(6).toString('hex');
                    
                    // this variable holds only the fields that are available on the users model
                    var unwanted = ['Date_of_Birth', 'Specialization', 'ConfirmPassword'];
                    var userData = Object.keys(req.body)
                        .filter(key => unwanted.includes(key) == false)
                        .reduce((obj, key) => {
                            obj[key] = req.body[key];
                            return obj;
                        }, {});

                    // make user a client
                    userData['isTherapist'] = true;

                    var newUser = Users(userData).save((err, data) => {
                        if (err) throw err;
                        
                        // remove the confirmPassword field
                        delete req.body.ConfirmPassword;

                        var newTherapist = Therapist(req.body).save((err, data) => {
                            if (err) throw err;
    
                            return res.status(200).send("Therapist has been added successfully");
                        })

                    })

                }

            } catch (error) {

                console.log(error);
                return res.status(500).send(error); // AJAX intepretes this and display appropiate error messages
            }

        })
        .catch(err => {
            if (err) throw err;
        });

});

Router.get('/summary', verify, (req, res) => {

    console.log(`Request made to : a${req.url}`);

    // gets all the therapists
    Client.find()
        .then(docs => {
            if (docs) {    
                res.render('summary', { userStatus: req.user, data: docs });
            } else {
                // this will only run is the one above it doesn't
                res.render('summary', {userStatus: req.user});
            }
        })
        .catch(err => {
            if (err) console.log(err);
        })

});

// This makes sure all normal routes called from the client route c/ will redirect backwards
Router.get('/', (req, res) => {

    res.redirect('../');

})

Router.get('/index', (req, res) => {

    console.log("Here");

    res.redirect('../index');

})

Router.get('/about', (req, res) => {

    console.log("Here");

    res.redirect('../about');

})

Router.get('/contact', (req, res) => {

    console.log("Here");

    res.redirect('../contact');

})

Router.get('/services', (req, res) => {

    console.log("Here");

    res.redirect('../services');

})

Router.get('/users/login', (req, res) => {

    console.log("Here");

    res.redirect('../users/login');

})

Router.get('/users/logout', (req, res) => {

    console.log("Here");

    res.redirect('../users/logout');

})

// registering an admin

// creating a register schema with Hapi Joi
// const adminRegisterSchema = Joi.object({
//     First_Name: Joi.string().min(2).required(),
//     Last_Name: Joi.string().min(2).required(),
//     Email: Joi.string().min(6).required().email(),
//     Telephone: Joi.string().min(6).required(),
//     Password: Joi.string().min(8).required(),
//     ConfirmPassword: Joi.string().min(8),
//     Security_Question: Joi.string().required(),
//     Answer: Joi.string().required(),
//     Unique_Code: Joi.string()
// });

// Router.post('/register-admin', async (req, res) => {

//     // it uses an async function because of the encrytion processes it has
//     Users.findOne({ Email: req.body.Email })
//         .then(async (docs) => {

//             if (docs != null) {
//                 return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
//             }

//             // this is a try catch because this process might fail
//             try {

//                 // Now verify user input using hapi/joi
//                 const { error } = await adminRegisterSchema.validateAsync(req.body);

//                 if (error) {
//                     return res.status(400).send(error.details[0].message); // AJAX will inteprete the result and find what fields on the form has an issue
//                 } else {
                    
//                     // hashing the password
//                     const salt = await bcrypt.genSalt(10);
//                     const hashedPassword = await bcrypt.hash(req.body.Password, salt);

//                     // change the password that is stored in db
//                     req.body.Password = hashedPassword;

//                     // generate random code for user
//                     req.body.Unique_Code = crypto.randomBytes(6).toString('hex');
                    
//                     // this variable holds only the fields that are available on the users model
//                     var unwanted = ['Security_Question', 'Answer', 'ConfirmPassword'];
//                     var userData = Object.keys(req.body)
//                         .filter(key => unwanted.includes(key) == false)
//                         .reduce((obj, key) => {
//                             obj[key] = req.body[key];
//                             return obj;
//                         }, {});

//                     // make user a client
//                     userData['isAdmin'] = true;

//                     var newUser = Users(userData).save((err, data) => {
//                         if (err) throw err;
                        
//                         // remove the confirmPassword field
//                         delete req.body.ConfirmPassword;

//                         var newTherapist = Admin(req.body).save((err, data) => {
//                             if (err) throw err;
    
//                             return res.status(200).send("Admin has been added successfully");
//                         })

//                     })

//                 }

//             } catch (error) {

//                 console.log(error);
//                 return res.status(500).send(error); // AJAX intepretes this and display appropiate error messages
//             }

//         })
//         .catch(err => {
//             if (err) throw err;
//         });

// })

module.exports = Router;