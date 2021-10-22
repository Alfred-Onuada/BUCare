const Users = require("./../models/user");
const Therapists = require("./../models/therapist");
const Clients = require("./../models/client");
const Admin = require("./../models/admin");
const Rooms = require('./../models/room');
const Reports = require("./../models/report");

// Initialize Packages
const Router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// hapi jo helps carry out input validation
const Joi = require("@hapi/joi");

// verification route
const verify = require("./auths/verify");

// creating a register schema with Hapi Joi
const therapistRegisterSchema = Joi.object({
  First_Name: Joi.string().min(2).required(),
  Last_Name: Joi.string().min(2).required(),
  Email: Joi.string().min(6).required().email(),
  Telephone: Joi.string().min(6).required(),
  Password: Joi.string().min(8).required(),
  Sex: Joi.string().required(),
  Specialization: Joi.array().required(),
  Education_Level: Joi.string().required(),
  Unique_Code: Joi.string(),
});

Router.post("/register", async (req, res) => {
  // it uses an async function because of the encrytion processes it has
  Users.findOne({ Email: req.body.Email })
    .then(async (docs) => {
      if (docs != null) {
        return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
      }

      // transform the specialization sentence into array
      req.body.Specialization = req.body.Specialization.split(", ");

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
          req.body.Unique_Code = crypto.randomBytes(6).toString("hex");

          // this variable holds only the fields that are available on the users model
          var unwanted = ["Date_of_Birth", "Specialization", "Education_Level"];
          var userData = Object.keys(req.body)
            .filter((key) => unwanted.includes(key) == false)
            .reduce((obj, key) => {
              obj[key] = req.body[key];
              return obj;
            }, {});

          // make user a client
          userData["isTherapist"] = true;

          var newUser = Users(userData).save((err, data) => {
            if (err) throw err;

            // remove the confirmPassword field
            delete req.body.ConfirmPassword;

            var newTherapist = Therapists(req.body).save((err, data) => {
              if (err) throw err;

              return res
                .status(200)
                .send("Therapist has been added successfully");
            });
          });
        }
      } catch (error) {
        console.log(error);
        return res.status(500).send(error); // AJAX intepretes this and display appropiate error messages
      }
    })
    .catch((err) => {
      if (err) throw err;
    });
});

Router.get("/summary", verify, (req, res) => {
  console.log(`Request made to : a${req.url}`);

  let data = {};
  Clients.find()
    .then((c_docs) => {
      if (c_docs) {
        data.clients = c_docs;

        Therapists.find()
          .then((t_docs) => {
            if (t_docs) {
              data.therapists = t_docs;
              res.render("summary", { userStatus: req.user, info: data });
            } else {
              res.render("summary", { userStatus: req.user, info: data });
            }
          })
          .catch((err) => {
            if (err) console.log(err);
          });
      } else {
        // this will only run is the one above it doesn't
        res.render("summary", { userStatus: req.user });
      }
    })
    .catch((err) => {
      if (err) console.log(err);
    });
});

// route for disabling user accounts
Router.put("/toggleDisabledStatus", verify, (req, res) => {
  console.log(`Request made to : ${req.url}`);

  if (!req.user.isAdmin) {
    return res.status(401).send();
  }

  const data = req.body;

  if (data.user === "therapist") {
    Therapists.findOne({ _id: data.userId })
      .then((users_docs) => {
        const userEmail = users_docs.Email;

        Therapists.findByIdAndUpdate(data.userId, { Disabled: data.newValue })
          .then((info) => {
            Users.findOneAndUpdate(
              { Email: userEmail },
              { Disabled: data.newValue }
            )
              .then((info) => {
                res.status(200).send(data.newValue);
              })
              .catch((err) => {
                if (err) console.log(err);

                res.status(500).send("Update Failed");
              });
          })
          .catch((err) => {
            if (err) console.log(err);

            res.status(500).send("Update Failed");
          });
      })
      .catch((err) => {
        if (err) console.log(err);

        res.status(500).send("Update Failed");
      });
  } else if (data.user === "client") {
    Clients.findOne({ _id: data.userId })
      .then((users_docs) => {
        const userEmail = users_docs.Email;

        const statusValue = (data.newValue === false) ? 'active' : 'disabled';

        Clients.findByIdAndUpdate(data.userId, { Disabled: data.newValue, Status: statusValue })
          .then((info) => {
            Users.findOneAndUpdate(
              { Email: userEmail },
              { Disabled: data.newValue }
            )
              .then((info) => {
                res.status(200).send(data.newValue);
              })
              .catch((err) => {
                if (err) console.log(err);

                res.status(500).send("Update Failed");
              });
          })
          .catch((err) => {
            if (err) console.log(err);

            res.status(500).send("Update Failed");
          });
      })
      .catch((err) => {
        if (err) console.log(err);

        res.status(500).send("Update Failed");
      });
  } else {
    res.status(400).send();
  }
});

Router.delete("/deleteUser", verify, (req, res) => {
  console.log(`Request made to : ${req.url}`);

  if (!req.user.isAdmin) {
    return res.status(401).send();
  }

  const data = req.body;

  if (data.user === 'therapist') {

    Therapists.findByIdAndDelete(data.userId)
      .then(t_docs => {
        if (t_docs) {
          let email = t_docs.Email;

          Users.findOneAndDelete({ Email: email })
            .then(u_docs => {
              if (u_docs) {
                Rooms.deleteMany({ TherapistId: u_docs._id })
                  .then(r_docs => {
                    return res.status(200).send();
                  })
              } else {
                return res.status(400).send("This user doesn't exist");
              }
            })
        }
      })

  } else if (data.user === 'client') {

    Clients.findByIdAndDelete(data.userId)
      .then(c_docs => {
        if (c_docs) {
          let email = c_docs.Email;

          Users.findOneAndDelete({ Email: email })
            .then(u_docs => {
              if (u_docs) {
                Rooms.deleteMany({ ClientId: u_docs._id })
                  .then(r_docs => {
                    if (r_docs) {
                      return res.status(200).send();
                    }
                  })
              } else {
                return res.status(400).send("This user doesn't exist");
              }
            })
        }
      })

  } else {
    return res.status(400).send();
  }

});

Router.get('/getreport/:userId', verify, (req, res) => {

  console.log(`Request made to : ${req.url}`);

  if (!req.user.isAdmin) {
    return res.status(401).send();
  }

  let reportData = {}
  // getting the client email
  Clients.findById(req.params.userId)
    .then(docs => {
      if (docs) {
        reportData.clientEmail = docs.Email;

        // getting the clients id from the user collection
        Users.findOne({ Email: docs.Email })
          .then(u_docs => {
            if (u_docs) {

              // getting the report data
              Reports.findOne({ ClientId: u_docs._id })
                .then(r_docs => {
                  if (r_docs) {
                    reportData.comment = r_docs.Case_Description;
                    reportData.category = r_docs.Case;

                    // getting the therapist email
                    Users.findById(r_docs.TherapistId)
                      .then(u_docs => {
                        if (u_docs) {
                          reportData.therapistEmail = u_docs.Email;

                          return res.status(200).send(reportData);

                        } else {
                          return res.status(400).send("Sorry, something went wrong while performing this operation 4");
                        }
                      })
                      .catch(err => {
                        if (err) console.error(err);
                      })
                  } else {
                    return res.status(400).send("Sorry, something went wrong while performing this operation 3");
                  }
                })
                .catch(err => {
                  if (err) console.error(err);
                })

            } else {
              return res.status(400).send("Sorry, something went wrong while performing this operation 2");
            }
          })
          .catch(err => {
            if (err) console.error(err);
          })
      } else {
        return res.status(400).send("Sorry, something went wrong while performing this operation 1");
      }
    })
    .catch(err => {
      if (err) console.error(err);
    })
});

// This makes sure all normal routes called from the client route c/ will redirect backwards
Router.get("/", (req, res) => {
  res.redirect("../");
});

Router.get("/index", (req, res) => {
  console.log("Here");

  res.redirect("../index");
});

Router.get("/about", (req, res) => {
  console.log("Here");

  res.redirect("../about");
});

Router.get("/contact", (req, res) => {
  console.log("Here");

  res.redirect("../contact");
});

Router.get("/services", (req, res) => {
  console.log("Here");

  res.redirect("../services");
});

Router.get("/users/login", (req, res) => {
  console.log("Here");

  res.redirect("../users/login");
});

Router.get("/users/logout", (req, res) => {
  console.log("Here");

  res.redirect("../users/logout");
});

// registering an admin

// creating a register schema with Hapi Joi
// const adminRegisterSchema = Joi.object({
//     First_Name: Joi.string().min(2).required(),
//     Last_Name: Joi.string().min(2).required(),
//     Email: Joi.string().min(6).required().email(),
//     Telephone: Joi.string().min(6).required(),
//     Sex: Joi.string().required(),
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
