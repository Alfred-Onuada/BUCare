const Clients = require("./../../models/client");
const Therapists = require("./../../models/therapist");
const Rooms = require("./../../models/room");
const Users = require("./../../models/user");
const Admin = require("./../../models/admin");

// Initialize Packages
const Router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// hapi jo helps carry out input validation
const Joi = require("@hapi/joi");

// middlewares
const checkUser = require("./checkUser");

/*

    use abstract api to validate if an email and phone is legit before sending unique code
    and check if some fields are optional
    phone number must be specified using the international number format '+'
    also can add expiration date for unique code and code should be delete after registration

*/

// Note: only client registrations hit this schema

// creating a register schema with Hapi Joi
const usersRegisterSchema = Joi.object({
  First_Name: Joi.string().min(2),
  Last_Name: Joi.string().min(2),
  Username: Joi.string().min(2).required(),
  Email: Joi.string().min(6).required().email(),
  Telephone: Joi.number().min(6),
  Password: Joi.string().min(8).required(),
  Date_of_Birth: Joi.string().min(10).max(10), // 12-12-2021 makes 10 characters
  Sex: Joi.string().required(),
  Case: Joi.string().required(),
  Assigned_Therapist: Joi.string().required(),
  Unique_Code: Joi.string(),
});

// creating a room schema with Hapi Joi
const roomSchema = Joi.object({
  ClientId: Joi.string().required(),
  TherapistId: Joi.string().required(),
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

        // hashing the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.Password, salt);

        // change the password that is stored in db
        req.body.Password = hashedPassword;

        // generate random code for user
        req.body.Unique_Code = crypto.randomBytes(6).toString("hex");

        // take and store the therapist name for use when creating room
        var therapistName = req.body.Assigned_Therapist;

        // this variable holds only the fields that are available on the users model
        var unwanted = [
          "Date_of_Birth",
          "Case",
          "Assigned_Therapist",
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
            if (err) throw err;

            var tFName = therapistName.split(" ");

            Users.findOne({
              First_Name: tFName[0],
              Last_Name: tFName[1],
              isTherapist: true,
            })
              .then(async (docs) => {
                // both client and therapist ids are from the users table not their individual table
                // this code will throw an error if the therapist doesnt exits so dont worry
                roomObj = {
                  ClientId: uData._id.toString(),
                  TherapistId: docs._id.toString(),
                };

                try {
                  // once a user a registered he gets attach to the same room as his therapist
                  await roomSchema.validateAsync(roomObj);

                  Rooms(roomObj).save((err, docs) => {
                    if (err) console.log(err);

                    // res.status(200).send("Room created");
                  }); 
                } catch (error) {
                  return res.status(400).send(error.details[0].message);
                }

              })
              .catch((err) => {
                if (err) throw err;
              });

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

Router.post("/checkpwd", checkUser, async (req, res) => {

  const { oldPwd } = req.body;

  if (req.userInfo) {

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

    // if the same
    return res.status(200).send();

  } else {
    return res.status(401).send("Access Denied! Unauthorized request");
  }

})

Router.post('/changepwd', checkUser, async (req, res) => {

  const { newPwd } = req.body;

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
          console.log("Here");
          result2 = await Clients.findOneAndUpdate(result.Email, { Password: hashedPassword })
        } else if (req.userInfo.isTherapist) {
          result2 = await Therapists.findOneAndUpdate(result.Email, { Password: hashedPassword })
        } else if (req.userInfo.isAdmin) {
          result2 = await Admin.findOneAndUpdate(result.Email, { Password: hashedPassword })
        }

        if (result2) {
          return res.status(200).send();
        } else {
          return res.status(500).send("Oops! something went wrong, your changes have not be saved");
        }

      } else {
        return res.status(500).send("Oops! something isn't right, contact the help desk");
      }
    } catch (error) {
      return res.status(500).send("Oops! something isn't right, contact the help desk");
    }
  } else {
    return res.status(401).send("Access Denied! Unauthorized request");
  }

})

module.exports = Router;
