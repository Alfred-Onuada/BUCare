const Users = require('./../../models/user');

// Initialize Packages
const Router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// hapi jo helps carry out input validation
const Joi = require('@hapi/joi');

/*

    use abstract api to validate if an email and phone is legit before sending unique code
    and check if some fields are optional
    phone number must be specified using the international number format '+'
    also can add expiration date fro unique code and code should be delete after registration

*/

// creating a register schema with Hapi Joi
const registerSchema = Joi.object({
    First_Name: Joi.string().min(2).required(),
    Last_Name: Joi.string().min(2).required(),
    Email: Joi.string().min(6).required().email(),
    Telephone: Joi.string().min(6).required(),
    Password: Joi.string().min(8).required(),
});


Router.post('/register', async (req, res)=> {

    // it uses an async function because of the encrytion processes it has
    Users.findOne({ Email: req.body.Email })
        .then(async (docs) => {

            if (docs != null) {
                return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
            }

            // this is a try catch because this process might fail
            try {

                // Now verify user input using hapi/joi
                const { error } = await registerSchema.validateAsync(req.body);

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

                    var newUser = Users(req.body).save((err, data) => {
                        if (err) throw err;

                        // automatic login after registration
                        return res.redirect(307, '/users/login');
                    })

                }

            } catch (error) {
                return res.status(500).send(error); // AJAX intepretes this and display appropiate error messages
            }

        })
        .catch(err => {
            if (err) throw err;
        });

});


// creating a login schema with Hapi Joi
const loginSchema = Joi.object({
    Email: Joi.string().min(6).required().email(),
    Password: Joi.string().min(8).required(),
});

Router.post('/login', async (req, res)=> {

    // this code cleans the req.body object leaving only email and password
    // it is useful because when the user registers he is automatically logged in with all the req.body data
    req.body = {Email: req.body.Email, Password: req.body.Password}

    try {

        // validate login details
        const { error } = await loginSchema.validateAsync(req.body);
        if (error) {
            return res.status(400).send(error.details[0].message);
        }

    } catch (error) {
        return res.status(500).send(error);
    }

    // check if user exists using email
    Users.findOne({ Email: req.body.Email })
        .then(async (docs) => {

            if (docs == null) {
                return res.status(400).send("User Doesn't exist");
            }
        
            const validPassword = await bcrypt.compare(req.body.Password, docs.Password);
            if(!validPassword) {
                return res.status(400).send("Incorrect Password");
            }
        
            // sign user with jwt 
            const token = jwt.sign({_id: docs._id}, process.env.TOKEN_SECRET, { expiresIn: '30d' });
        
            // write token to cookies storage in client browser
            return res.writeHead(200, {
                
                "Set-Cookie": `tk=${token}; HttpOnly; path=/`,
                "Access-Control-Allow-Credentials": "true"
        
            }).send(); // i cant send data but probably from the status code the front end will know its successful
        
            // the path=/ makes it available to all pages
            // the HttpOnly; makes it secure so front end Js cant access its        

        })
        .catch(err => {
            if (err) throw err;
        })

});

Router.get('/logout', (req, res) => {

    // this route just sets the token to 'invalid' which is not a valid token
    return res.writeHead(200, {
                
        "Set-Cookie": `tk=invalid; HttpOnly; path=/`,
        "Access-Control-Allow-Credentials": "true"

    }).send(); // AJAX will recieve status code and force the browser to reload to another page

});

module.exports = Router;