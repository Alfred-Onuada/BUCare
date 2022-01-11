const Clients = require("./../../models/client");
const Therapists = require("./../../models/therapist");
const Users = require("./../../models/user");
const Admin = require("./../../models/admin");
const TempUsers = require('./../../models/tempUser');

// Initialize Packages
const Router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// use for sending emails
const { sendResetEmail, sendPasswordHasChangedEmail } = require('../emails/emailController');

// hapi jo helps carry out input validation
const Joi = require("@hapi/joi");

// middlewares
const checkUser = require("./checkUser");

// Note: only client registrations hit this schema

// creating a register schema with Hapi Joi
const usersRegisterSchema = Joi.object({
  First_Name: Joi.string().min(2),
  Last_Name: Joi.string().min(2),
  Username: Joi.string().min(2).required(),
  Email: Joi.string().min(6).pattern(/(\d{4}@student.babcock.edu.ng|@babcock.edu.ng)$/i).required().email(),
  Telephone: Joi.number().min(6),
  Password: Joi.string().min(8).required(),
  Date_of_Birth: Joi.string().min(10).max(10), // 12-12-2021 makes 10 characters
  Sex: Joi.string().required(),
});

Router.post("/register", async (req, res) => {
  // it uses an async function because of the encrytion processes it has
  Users.findOne({ Email: req.body.Email })
    .then(async (docs) => {
      if (docs != null) {
        return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
      }

      // this is a try catch because this process might fail
      try {
        // Now verify user input using hapi/joi
        const { error } = await usersRegisterSchema.validateAsync(req.body);

        if (error) {
          return res.status(400).send("Something went wrong validating the credentials")
        }

        // hashing the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.Password, salt);

        // change the password that is stored in db
        req.body.Password = hashedPassword;

        // this variable holds only the fields that are available on the users model
        var unwanted = [
          "Date_of_Birth",
          "ConfirmPassword",
        ];
        var userData = Object.keys(req.body)
          .filter((key) => unwanted.includes(key) == false)
          .reduce((obj, key) => {
            obj[key] = req.body[key];
            return obj;
          }, {});

        // make user a client
        userData["isClient"] = true;

        var newUser = Users(userData).save((err, uData) => {
          if (err) throw err;

          // remove the confirmPassword field
          delete req.body.ConfirmPassword;

          var newClient = Clients(req.body).save((err, data) => {
            if (err) {
              return res.status(500).send();
            };
            
            // automatic login after registration
            return res.redirect(307, "/users/login");
          });
        });

        // send a validation email
      } catch (error) {
        return res.status(500).send(error.details[0].message); // AJAX intepretes this and display appropiate error messages
      }
    })
    .catch((err) => {
      if (err) throw err;
    });
});

// creating a login schema with Hapi Joi
// login schema shouldn't include a minimum length for the data because its a login you dont want the user to know
const loginSchema = Joi.object({
  Email: Joi.string().required().email(),
  Password: Joi.string().required(),
});

Router.post("/login", async (req, res) => {
  // this code cleans the req.body object leaving only email and password
  // it is useful because when the user registers he is automatically logged in with all the req.body data
  req.body = { Email: req.body.Email, Password: req.body.Password };

  try {
    // validate login details
    await loginSchema.validateAsync(req.body);
    
  } catch (error) {
    return res.status(500).send(error.details[0].message);
  }

  // check if user exists using email
  Users.findOne({ Email: req.body.Email })
    .then(async (docs) => {
      if (docs && docs.Disabled) {
        return res
          .status(401)
          .send(
            "Sorry, this account has been temporarily suspended, for more info reach out to our customer support"
          );
      }

      if (docs == null) {
        // return res.status(400).send("User Doesn't exist"); uncomment for debugging purposes
        return res.status(401).send("User Crendentials Invalid");
      }

      const validPassword = await bcrypt.compare(
        req.body.Password,
        docs.Password
      );
      if (!validPassword) {
        // return res.status(400).send("Incorrect Password"); uncomment for debugging purposes
        return res.status(401).send("User Crendentials Invalid");
      }

      // sign user with jwt
      const token = jwt.sign({ _id: docs._id }, process.env.TOKEN_SECRET, {
        expiresIn: "30d",
      });

      // write token to cookies storage in client browser
      return res
        .writeHead(200, {
          "Set-Cookie": `tk=${token}; HttpOnly; path=/; expires=${new Date(
            new Date().getTime() + 2592000000
          ).toUTCString()}`,
          "Access-Control-Allow-Credentials": "true",
        })
        .send(); // i cant send data but probably from the status code the front end will know its successful

      // the path=/ makes it available to all pages
      // the HttpOnly; makes it secure so front end Js cant access it
      // expires = current day + 30days in milliseonds
    })
    .catch((err) => {
      if (err) throw err;
    });
});

Router.get("/logout", (req, res) => {
  // this route just sets the token to 'invalid' which is not a valid token
  return res
    .writeHead(200, {
      "Set-Cookie": `tk=invalid; HttpOnly; path=/`,
      "Access-Control-Allow-Credentials": "true",
    })
    .send(); // AJAX will recieve status code and force the browser to reload to another page
});

// confirms password during reset password
Router.post("/checkpwd", checkUser, async (req, res) => {

  const { oldPwd } = req.body;

  if (req.userInfo) {

    try {

      const userData = await Users.findById(req.userInfo._id);

      // if for any reason your record gets deleted from the database
      if (userData == null) {
        return res.status(401).send("Access Denied! Unauthorized request");
      }    
      
      const validPassword = await bcrypt.compare(
        oldPwd,
        userData.Password
      );

      if (!validPassword) {
        return res.status(401).send("Invalid Password");
      }

      let securityQuestion = "";
      if (req.userInfo.isAdmin) {
        const data = await Admin.findOne({ Email: userData.Email });
        
        if (data != null) {
          securityQuestion = data.Security_Question;
        } else {
          // this doesn't have to return because the code has to run the last line below this
          res.status(401).send("Access Denied! Unauthorized request")
        }
      }

      // if the same
      return res.status(200).send(securityQuestion);

    } catch (error) {
      console.log(error.message);
      return res.status(500).send("Something went wrong");
    }

  } else {
    return res.status(401).send("Access Denied! Unauthorized request");
  }

})

// confirms security question during admin reset password
Router.post("/checksquestion", checkUser, async (req, res) => {

  const { answer } = req.body;

  if (req.userInfo.isAdmin) {

    try {

      const userData = await Users.findById(req.userInfo._id);

      if (userData != null) {

        const adminData = await Admin.findOne({ Email: userData.Email });

        // if for any reason your record gets deleted from the database
        if (adminData == null) {
          return res.status(401).send("Access Denied! Unauthorized request");
        }    
        
        const validAnswer = answer == adminData.Answer.toLowerCase();
  
        if (!validAnswer) {
          return res.status(401).send("Invalid Answer");
        }
  
        // if the same
        return res.status(200).send();

      } else {
        return res.status(401).send("Access Denied! Unauthorized request");
      }

    } catch (error) {
      console.log(error.message);
      return res.status(500).send("Something went wrong");
    }

  } else {
    return res.status(401).send("Access Denied! Unauthorized request");
  }

})

Router.post('/changepwd', checkUser, async (req, res) => {

  // reqEmail and authToken maybe undefined it's not an error this route is used by users who are reseting their
  // password and users who forgot their password
  const { newPwd, reqEmail, authToken } = req.body;

  if (req.userInfo) {
    try {
    
      // hashing the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPwd, salt);
  
      // update the password on the users model
      const result = await Users.findByIdAndUpdate(req.userInfo._id, { Password: hashedPassword })

      if (result) {

        let result2 = null;
        if (req.userInfo.isClient) {
          result2 = await Clients.findOneAndUpdate(result.Email, { Password: hashedPassword })
        } else if (req.userInfo.isTherapist) {
          result2 = await Therapists.findOneAndUpdate(result.Email, { Password: hashedPassword })
        } else if (req.userInfo.isAdmin) {
          result2 = await Admin.findOneAndUpdate(result.Email, { Password: hashedPassword })
        }

        if (result2) {

          sendPasswordHasChangedEmail(result.Email)
            .then(response => {
              return res.status(response.status).send(response.message);
            })
            .catch(err => {
              return res.status(err.status).send(err.message);
            })

        } else {
          return res.status(500).send("Oops! something went wrong, your changes have not be saved");
        }

      } else {
        return res.status(500).send("Oops! something isn't right, contact the help desk");
      }
    } catch (error) {
      return res.status(500).send("Oops! something isn't right, contact the help desk");
    }
  } else if (reqEmail && authToken) {
    // checks to validate the token before granting password change request
    await TempUsers.findOne({ Email: reqEmail })
      .then(async user_info => {
        if (user_info) {

          let currentTime = new Date().getTime();

          // all the error seems are the same so the user doesn't know what went wrong
          // a regular user doesn't have to be bother because this check is for criminals🤣🤣
          // check for expired token
          if (currentTime > user_info.Expires_In) {
            return res.status(400).send("Access Denied! Unauthorized request");
          }

          // validate token
          if (authToken !== user_info.Unique_Code) {
            return res.status(400).send("Access Denied! Unauthorized request");
          }

          // if everything goes well
          if (authToken === user_info.Unique_Code) {

            const userData = await Users.findOne({ Email: reqEmail });

            // hashing the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPwd, salt);
        
            // update the password on the users model
            const result = await Users.findByIdAndUpdate(userData._id, { Password: hashedPassword })

            if (result) {

              let result2 = null;
              if (userData.isClient) {
                result2 = await Clients.findOneAndUpdate(result.Email, { Password: hashedPassword })
              } else if (userData.isTherapist) {
                result2 = await Therapists.findOneAndUpdate(result.Email, { Password: hashedPassword })
              } else if (userData.isAdmin) {
                result2 = await Admin.findOneAndUpdate(result.Email, { Password: hashedPassword })
              }

              if (result2) 

                sendPasswordHasChangedEmail(result.Email)
                  .then(response => {
                    return res.status(response.status).send(response.message);
                  })
                  .catch(err => {
                    return res.status(err.status).send(err.message);
                  })

              } else {
                return res.status(500).send("Oops! something went wrong, your changes have not be saved");
              }

          } else {
            return res.status(500).send("Oops! something isn't right, contact the help desk");
          }

        } else {
          // the reason this is a 500 error is because the user is not the one providing the data
          return res.status(500).send("Something went wrong, try again later");
        }
      })
      .catch(err => {
        console.log(err.message);
        return res.status(500).send("Something went wrong");
      })
  } else {
    return res.status(401).send("Access Denied! Unauthorized request");
  }

})

// confirms email during forgot password
Router.post('/checkemail', async (req, res) => {

  const { resetEmail, websiteUrl } = req.body;

  Users.findOne({ Email: resetEmail })
    .then(async userData => {
      if (userData) {
        // although the name is reset email it is for the forgot password
        sendResetEmail(resetEmail, websiteUrl)
          .then(response => {
            // lol this code just relays what so ever is gotten from the email controller
            return res.status(response.status).send(response.message);
          })
          .catch(err => {
            // lol this code just relays what so ever is gotten from the email controller
            return res.status(err.status).send(err.message);
          })

      } else {
        return res.status(400).send("The provided email doesn't exist");
      }
    })
    .catch(err => {
      if (err) console.log(err.message);
      return res.status(500).send("Something went wrong");
    })

});

module.exports = Router;
