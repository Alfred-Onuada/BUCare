const Users = require("./../models/user");
const Therapists = require("./../models/therapist");
const Clients = require("./../models/client");
const Admin = require("./../models/admin"); // remains unused until you uncomment the last code segment
const Rooms = require("./../models/room");
const Reports = require("./../models/report");
const CaseFiles = require("./../models/caseFile");

// Initialize Packages
const Router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // remains unused until you uncomment the last code segment

// hapi jo helps carry out input validation
const Joi = require("@hapi/joi");

// verification route
const verify = require("./auths/verify");
const req = require("express/lib/request");


// functions for emails
const { sendReportAsEmail } = require("./emails/emailController");

// creating a register schema with Hapi Joi
const therapistRegisterSchema = Joi.object({
  First_Name: Joi.string().min(2).required(),
  Last_Name: Joi.string().min(2).required(),
  Email: Joi.string().min(6).required().email(),
  Telephone: Joi.number().min(6).required(),
  Password: Joi.string().min(8).required(),
  Sex: Joi.string().required(),
  Specialization: Joi.array().required(),
  Education_Level: Joi.array().required(),
  Unique_Code: Joi.string(),
});

Router.post("/register", verify, async (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  // it uses an async function because of the encrytion processes it has
  Users.findOne({ Email: req.body.Email })
    .then(async (docs) => {
      if (docs != null) {
        return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
      }

      // this is a try catch because this process might fail
      try {
        // Now verify user input using hapi/joi
        await therapistRegisterSchema.validateAsync(req.body);

        // if an error occured the code will jump out so don't bother because of the try and catch block
        // hashing the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.Password, salt);

        // change the password that is stored in db
        req.body.Password = hashedPassword;

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

        Users(userData).save((err, data) => {
          if (err) throw err;

          // remove the confirmPassword field
          delete req.body.ConfirmPassword;

          Therapists(req.body).save((err, data) => {
            if (err) throw err;

            return res
              .status(200)
              .send("Therapist has been added successfully");
          });
        });
      } catch (error) {
        return res.status(400).send(error.details[0].message); // AJAX intepretes this and display appropiate error messages
      }
    })
    .catch((err) => {
      if (err) throw err;
    });
});

Router.get("/summary", verify, (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  let data = {};
  Clients.find()
    .then((c_docs) => {
      if (c_docs) {
        data.clients = c_docs;

        Therapists.find()
          .then(async (t_docs) => {
            if (t_docs) {
              data.therapists = t_docs;

              // retrieve the total number of clients each therapist is currently and has ever handled
              let totalAssignedTherapist = []; // array that will be used to determine your all-time client count
              data.clients.forEach(client => {
                totalAssignedTherapist.push(...client.Assigned_Therapists);
              })

              data.therapists.forEach(async therapist => {
                let myCLients = totalAssignedTherapist.filter(item => item == therapist.First_Name + " " + therapist.Last_Name);
                therapist.Total_Clients_Count = myCLients.length;
              })

              async function getTotalConcludedClients(index) {
                let therapist = data.therapists[index];

                let { _id:tId } = await Users.findOne({ Email: therapist.Email });
                let myConcludedClients = await Rooms.find({ TherapistId: tId.toString(), Status: "concluded" });
                therapist.Total_Concluded_Clients_Count = myConcludedClients.length;

                if (index < data.therapists.length-1) {
                  getTotalConcludedClients(++index);
                }
              }

              await getTotalConcludedClients(0);

              res.render("summary", { userStatus: req.user, info: data, pages: req.pages });
            } else {
              res.render("summary", { userStatus: req.user, info: data, pages: req.pages });
            }
          })
          .catch((err) => {
            if (err) console.error(err.message);
          });
      } else {
        // this will only run is the one above it doesn't
        res.render("summary", { userStatus: req.user, pages: req.pages });
      }
    })
    .catch((err) => {
      if (err) console.error(err.message);
    });
});

// this shows all the casefiles for a client
Router.get("/casefiles/:clientId", verify, async (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  try {
    const userData = await Clients.findById(req.params.clientId);

    if (!userData) {
      return res.status(400).send("Please retry the previous action, thank you");
    } 

    const caseFilesInfo = [];

    if (userData.Assigned_Therapists.length == 0) {
      return res.render("casefiles", { userStatus: req.user, pages: req.pages, info: { name: userData.Username, Sex: userData.Sex, caseFilesInfo } })
    }

    // sorry for the IIFE lol it's just neat
    await (async function getCaseFiles(index = 0) {
      const therapistName = userData.Assigned_Therapists[index].split(" ");

      const { _id:tId, Sex:tGender } = await Users.findOne({ First_Name: therapistName[0], Last_Name: therapistName.slice(1).join(" ") })
      const { _id:cId } = await Users.findOne({ Email: userData.Email })

      const { _id:roomId } = await Rooms.findOne({ ClientId: cId, TherapistId: tId })

      const caseFilesForRoom = await CaseFiles.find({ RoomId: roomId }).sort('-1')

      caseFilesInfo.push({
        therapistName: therapistName.join(" "),
        therapistGender: tGender,
        roomId: roomId,
        reports: caseFilesForRoom
      })

      if (index < userData.Assigned_Therapists.length - 1) {
        await getCaseFiles(++index);
      }
    })()

    return res.render("casefiles", { userStatus: req.user, pages: req.pages, info: { name: userData.Username, Sex: userData.Sex, caseFilesInfo } })

  } catch (err) {
    console.error(err);
    return res.status(500).send("Something went wrong on our side.")
  }

})

// this route generates reports and sends them as email to the user
Router.post("/sendreportasemail", verify, async (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  try {

    const pdfData = {};
    // sets the admin's name
    pdfData.adminName = req.user.Name;

    // reciever's email has to be the admin's email
    const { Email:recieverEmail } = await Users.findById(req.user._id);

    const { roomId, caseId, websiteUrl, generationType } = req.body;
    const { TherapistId, ClientId } = await Rooms.findById(roomId);

    if (TherapistId && ClientId) {

      const tDocs = await Users.findById(TherapistId);
      // there is no username field directly in the users model
      const { Email:cEmail } = await Users.findById(ClientId);
      const cDocs = await Clients.findOne({ Email: cEmail });

      pdfData.therapistName = tDocs.First_Name + " " + tDocs.Last_Name;
      pdfData.clientName = cDocs.Username;

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      let reportData = null;
      // maybe later you will be able to specify a custom range
      if (generationType == "single") {
        reportData = await CaseFiles.findById(caseId);
  
        pdfData.table = {
          title: "",
          headers: ["Observation", "Instruments", "Recommendation", "Conclusion"],
          rows: [
            [reportData.Observation, reportData.Instruments, reportData.Recommendation, reportData.Conclusion]
          ]
        }

        const d = new Date(reportData.createdAt);

        let year = d.getFullYear();
        let month = months[d.getMonth()];
        let day = days[d.getDay()];
  
        pdfData.dateFormatted = `${day + ", " + d.getDate() + " " + month + " " + year}`;

      } else if (generationType == "multiple") {
        reportData = await CaseFiles.find({ RoomId: roomId });

        if (reportData == null) {
          res.status(400).send("The requested report doesn't exist");
        }
        let rowData = [];

        for (let i = 0; i < reportData.length; i++) {
          rowData.push([reportData[i].Observation, reportData[i].Instruments, reportData[i].Recommendation, reportData[i].Conclusion])
        }

        pdfData.table = {
          title: "",
          headers: ["Observation", "Instruments", "Recommendation", "Conclusion"],
          rows: rowData
        }

        const startDate = new Date(reportData[0].createdAt);
        const endDate = new Date(reportData[reportData.length - 1].createdAt);

        let [syear, eyear] = [startDate.getFullYear(), endDate.getFullYear()];
        let [smonth, emonth] = [months[startDate.getMonth()], months[endDate.getMonth()]];
        let [sday, eday] = [days[startDate.getDay()], days[endDate.getDay()]];
  
        pdfData.dateFormatted = `${sday + ", " + startDate.getDate() + " " + smonth + " " + syear} through ${eday + ", " + endDate.getDate() + " " + emonth + " " + eyear}`;

      } else {
        res.status(400).send("Please refresh the page and try again an error occured.")
      }

      const fileName = `${pdfData.clientName}ReportFrom${pdfData.dateFormatted.replace(/,*\s/g, "")}.pdf`;
      const response = await sendReportAsEmail(pdfData, fileName, recieverEmail, websiteUrl);

      res.status(response.status).send(response.message);

    } else {
      res.status(400).send("Something went wrong please refresh the page and try again.");
    }

  } catch (error) {
    res.status(500).send("Something went wrong while processing email")
    console.error(error.message);
  }
  
})

// route for disabling user accounts
Router.put("/toggleDisabledStatus", verify, (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
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
                if (err) console.error(err.message);

                res.status(500).send("Update Failed");
              });
          })
          .catch((err) => {
            if (err) console.error(err.message);

            res.status(500).send("Update Failed");
          });
      })
      .catch((err) => {
        if (err) console.error(err.message);

        res.status(500).send("Update Failed");
      });
  } else if (data.user === "client") {
    Clients.findOne({ _id: data.userId })
      .then((users_docs) => {
        const userEmail = users_docs.Email;

        const statusValue = data.newValue === false ? "active" : "disabled";

        Clients.findByIdAndUpdate(data.userId, {
          Disabled: data.newValue,
          Status: statusValue,
        })
          .then((info) => {
            Users.findOneAndUpdate(
              { Email: userEmail },
              { Disabled: data.newValue }
            )
              .then((info) => {
                res.status(200).send(data.newValue);
              })
              .catch((err) => {
                if (err) console.error(err.message);

                res.status(500).send("Update Failed");
              });
          })
          .catch((err) => {
            if (err) console.error(err.message);

            res.status(500).send("Update Failed");
          });
      })
      .catch((err) => {
        if (err) console.error(err.message);

        res.status(500).send("Update Failed");
      });
  } else {
    res.status(400).send();
  }
});

Router.delete("/deleteUser", verify, (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  const data = req.body;

  if (data.user === "therapist") {
    Therapists.findByIdAndDelete(data.userId).then((t_docs) => {
      if (t_docs) {
        let email = t_docs.Email;

        Users.findOneAndDelete({ Email: email }).then((u_docs) => {
          if (u_docs) {
            Rooms.deleteMany({ TherapistId: u_docs._id }).then((r_docs) => {
              return res.status(200).send();
            });
          } else {
            return res.status(400).send("This user doesn't exist");
          }
        });
      }
    });
  } else if (data.user === "client") {
    Clients.findByIdAndDelete(data.userId).then((c_docs) => {
      if (c_docs) {
        let email = c_docs.Email;

        Users.findOneAndDelete({ Email: email }).then((u_docs) => {
          if (u_docs) {
            Rooms.deleteMany({ ClientId: u_docs._id }).then((r_docs) => {
              if (r_docs) {
                return res.status(200).send();
              }
            });
          } else {
            return res.status(400).send("This user doesn't exist");
          }
        });
      }
    });
  } else {
    return res.status(400).send();
  }
});

Router.get("/getreport/:userId", verify, (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  let reportData = {};
  // getting the client email
  Clients.findById(req.params.userId)
    .then((docs) => {
      if (docs) {
        reportData.clientEmail = docs.Email;

        // getting the clients id from the user collection
        Users.findOne({ Email: docs.Email })
          .then((u_docs) => {
            if (u_docs) {
              // getting the report data
              Reports.findOne({ ClientId: u_docs._id })
                .then((r_docs) => {
                  if (r_docs) {
                    reportData.comment = r_docs.Case_Description;
                    reportData.category = r_docs.Case;

                    // getting the therapist email
                    Users.findById(r_docs.TherapistId)
                      .then((u_docs) => {
                        if (u_docs) {
                          reportData.therapistEmail = u_docs.Email;

                          return res.status(200).send(reportData);
                        } else {
                          return res
                            .status(400)
                            .send(
                              "Sorry, something went wrong while performing this operation 4"
                            );
                        }
                      })
                      .catch((err) => {
                        if (err) console.error(err);
                      });
                  } else {
                    return res
                      .status(400)
                      .send(
                        "Sorry, something went wrong while performing this operation 3"
                      );
                  }
                })
                .catch((err) => {
                  if (err) console.error(err);
                });
            } else {
              return res
                .status(400)
                .send(
                  "Sorry, something went wrong while performing this operation 2"
                );
            }
          })
          .catch((err) => {
            if (err) console.error(err);
          });
      } else {
        return res
          .status(400)
          .send(
            "Sorry, something went wrong while performing this operation 1"
          );
      }
    })
    .catch((err) => {
      if (err) console.error(err);
    });
});

Router.get("/resetpwd", verify, (req, res) => {  

  if (!req.user.isAdmin) {
    return res.status(401).send("You do not have the required clearance to perform this operation");
  }

  return res.render("resetAdminPassword", { userStatus: req.user, pages: req.pages });
})

// This makes sure all normal routes called from the client route c/ will redirect backwards
Router.get("/", (req, res) => {
  res.redirect("../");
});

Router.get("/index", (req, res) => {
  res.redirect("../index");
});

Router.get("/about", (req, res) => {
  res.redirect("../about");
});

Router.get("/contact", (req, res) => {
  res.redirect("../contact");
});

Router.get("/users/login", (req, res) => {
  res.redirect("../users/login");
});

Router.get("/users/logout", (req, res) => {
  res.redirect("../users/logout");
});

// registering an admin

// creating a register schema with Hapi Joi
// const adminRegisterSchema = Joi.object({
//     First_Name: Joi.string().min(2).required(),
//     Last_Name: Joi.string().min(2).required(),
//     Email: Joi.string().min(6).required().email(),
//     Telephone: Joi.number().min(6).required(),
//     Sex: Joi.string().required(),
//     Password: Joi.string().min(8).required(),
//     ConfirmPassword: Joi.string().min(8),
//     Security_Question: Joi.string().required(),
//     Answer: Joi.string().required(),
// });

// Router.post("/register-admin", async (req, res) => {
//   // it uses an async function because of the encrytion processes it has
//   Users.findOne({ Email: req.body.Email })
//     .then(async (docs) => {
//       if (docs != null) {
//         return res.status(400).send("Email already exists"); // register users using AJAX request so you can get the error message in JS without overwriting the page
//       }

//       // this is a try catch because this process might fail
//       try {
//         // Now verify user input using hapi/joi
//         await adminRegisterSchema.validateAsync(req.body);

//         // hashing the password
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(req.body.Password, salt);

//         // change the password that is stored in db
//         req.body.Password = hashedPassword;

//         // this variable holds only the fields that are available on the users model
//         var unwanted = ["Security_Question", "Answer", "ConfirmPassword"];
//         var userData = Object.keys(req.body)
//           .filter((key) => unwanted.includes(key) == false)
//           .reduce((obj, key) => {
//             obj[key] = req.body[key];
//             return obj;
//           }, {});

//         // make user a client
//         userData["isAdmin"] = true;

//         var newUser = Users(userData).save((err, data) => {
//           if (err) throw err;

//           // remove the confirmPassword field
//           delete req.body.ConfirmPassword;

//           var newTherapist = Admin(req.body).save((err, data) => {
//             if (err) throw err;

//             return res.status(200).send("Admin has been added successfully");
//           });
//         });
//       } catch (error) {
//         return res.status(400).send(error.details[0].message); // AJAX intepretes this and display appropiate error messages
//       }
//     })
//     .catch((err) => {
//       if (err) throw err;
//     });
// });

module.exports = Router;
