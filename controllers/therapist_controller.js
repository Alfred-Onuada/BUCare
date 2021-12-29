// retriving all the models
const Chats = require("./../models/chat");
const Rooms = require("./../models/room");
const Clients = require("./../models/client");
const Users = require("./../models/user");
const Therapists = require("./../models/therapist");
const Reports = require("./../models/report");
const CaseFile = require("../models/caseFile");

// Initialize Packages
const Router = require("express").Router();
const Io = require("./../main");
const Joi = require("@hapi/joi");

// verification route
const verify = require("./auths/verify");

const chatSchema = Joi.object({
  RoomId: Joi.string().required(),
  SpokesPerson: Joi.string().required(),
  Message: Joi.string().required(),
});

Router.get("/rooms", verify, (req, res) => {
  console.log(`Request made to : t${req.url}`);

  Io.on("connection", (socket) => {
    // Io tags the on('connection') event to itself with a callback containing the connected socket so for every new socket that connects it
    // attaches the connection event multiple time and fires again for all the old ones and the new ones. So i kill the event after it has finished below

    socket.join(req.user._id.toString()); // rooms have to be strings

    if (socket.rooms.has(req.user._id.toString())) {
      Io.to(socket.id).emit("ack_rooms", "success");
    } else {
      Io.to(socket.id).emit("ack_rooms", "failed");
    }

    // this code alerts all users that this person is now online
    const nowOnline = () => {
      // get all rooms that this person participates in
      Rooms.find({ TherapistId: req.user._id })
        .then(async (room_docs) => {
          for (let index = 0; index < room_docs.length; index++) {
            const room = room_docs[index];
            socket.to(room.ClientId).emit("isOnline", room._id);
          }
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    };

    nowOnline();

    socket.on("chat_message", async function (data) {

      try {
        await chatSchema.validateAsync(data);

        Chats(data).save((err, chat_docs) => {
          if (err) {
            console.log(err);
          } else {
            Rooms.findOne({ _id: data.RoomId })
              .then((room_docs) => {
                if (room_docs.TherapistId == data.SpokesPerson) {
                  data.reciever = room_docs.ClientId;
                } else {
                  data.reciever = room_docs.TherapistId;
                }

                data.ChatId = chat_docs._id;

                socket.to(data.reciever).emit("msg", data);
              })
              .catch((err) => {
                console.log(err);
              });
          }
        });
      } catch (error) {
        res.status(400).send(error.details[0].message);
      }
      
    });

    socket.on("message_status", (data) => {
      Chats.findByIdAndUpdate(data.ChatId.toString(), { Status: data.status })
        .then((docs) => {
          // emit an event so you can update the ui to show the message has been deleivered
          socket.to(data.SpokesPerson).emit("delivered");
        })
        .catch((err) => {
          console.log(err);
        });
    });

    socket.on("deliver_all", function (userId) {
      // get all rooms that this person participates in and then every chat where he is not the spokes man
      Rooms.find({ TherapistId: userId })
        .then(async (docs) => {
          const loop = async (_) => {
            for (let index = 0; index < docs.length; index++) {
              const room = docs[index];

              const roomId = room._id;
              // $ne means not equal to
              await Chats.updateMany(
                {
                  RoomId: roomId,
                  SpokesPerson: { $ne: userId },
                  Status: { $ne: "delivered", $ne: "seen" },
                },
                { Status: "delivered" }
              )
                .then((chat_docs) => {
                  if (chat_docs.modifiedCount != 0) {
                    // i send back a message for the frontend to update the ui
                    // even if the person is offline it doesnt matter i still updated the db
                    socket.to(room.ClientId).emit("delivered_all", roomId);
                  }
                })
                .catch((err) => {
                  if (err) console.log(err);
                });
            }
          };

          await loop();
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    });

    socket.on("seen_all_in_room", function (userId, roomId) {
      // get all rooms that this person participates in and then every chat where he is not the spokes man
      Rooms.find({ TherapistId: userId })
        .then(async (docs) => {
          const loop = async (_) => {
            for (let index = 0; index < docs.length; index++) {
              const room = docs[index];

              const roomId = room._id;
              // $ne means not equal to
              await Chats.updateMany(
                {
                  RoomId: roomId,
                  SpokesPerson: { $ne: userId },
                  Status: { $ne: "seen" },
                },
                { Status: "seen" }
              )
                .then((chat_docs) => {
                  if (chat_docs.modifiedCount != 0) {
                    // i send back a message for the frontend to update the ui
                    // even if the person is offline it doesnt matter i still updated the db
                    socket.to(room.ClientId).emit("seen_all_completed", roomId);
                  }
                })
                .catch((err) => {
                  if (err) console.log(err);
                });
            }
          };

          await loop();
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    });

    socket.on("left_room", function (roomId) {
      Rooms.findById(roomId)
        .then((room_docs) => {
          socket.to(room_docs.ClientId).emit("disbanded_room", roomId);
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    });

    socket.on("is_online_processed", (roomId) => {
      Rooms.findById(roomId)
        .then((docs) => {
          // because this handles events from therapist so the reciever is automatically the client
          var reciever = docs.ClientId;
          Io.to(reciever).emit("isAlsoOnline", roomId);

          // what happens here is that once the therapist confirms what rooms are active (are online) he activates the start/end a session feature
          let therapistId = docs.TherapistId;
          Io.to(therapistId).emit("enable_session_toggle", roomId);
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    });

    let sessionTimer;

    socket.on("begin_session", async (roomId) => {
      let clientId;
      let therapistId = req.user._id; // because this is the therapist controller

      await Rooms.findOne({ _id: roomId })
        .then((docs) => {
          if (docs) {
            clientId = docs.ClientId;
          }
        })
        .catch((err) => {
          if (err) {
            console.log(err);
          }
        });

      const newChat = {
        RoomId: roomId,
        SpokesPerson: "System",
        Message: "A new session started",
      };

      try {
        await chatSchema.validateAsync(newChat);

        Chats(newChat).save((err, docs) => {
          if (err) {
            console.log(err);
            return res.status(500).send();
          }

          // has to be sent back to both client and therapist
          socket.to(clientId).emit("session_started", docs);
          Io.to(therapistId).emit("session_started", docs); // Io.to().emit() because a socket won't broadcast to itself (you can make it to but no need)

          // the server manages the session so it doesnt matter if you guys go offline it will still end at the appropriate time.
          sessionTimer = setTimeout(() => {
            socket.to(clientId).emit('session_expired', docs.RoomId);
            Io.to(therapistId).emit('session_expired', docs.RoomId); // the true means that this session ended automatically
          }, 60 * 60 * 1000); // 1 hour
        });
      } catch (error) {
        res.status(500).send(error.details[0].message);
      }
      
    });

    socket.on('start_voice_call', roomId => {
      Rooms.findById(roomId)
        .then(docs => {
          if (docs) {
            const data = {
              RoomId: docs._id,
              Message: `Voice chat started at <a href="/video/${roomId}/voice" target="_blank">Here</a>`
            }
            Io.to(docs.TherapistId).emit('voip_started', data);
            Io.to(docs.ClientId).emit('voip_started', data);
          }
        })
    });

    socket.on('start_video_call', roomId => {
      Rooms.findById(roomId)
        .then(docs => {
          if (docs) {
            const data = {
              RoomId: docs._id,
              Message: `Voice chat started at <a href="/video/${roomId}/video" target="_blank">Here</a>`
            }
            Io.to(docs.TherapistId).emit('voip_started', data);
            Io.to(docs.ClientId).emit('voip_started', data);
          }
        })
    });

    socket.on("end_session", async (roomId) => {

      let clientId;
      let therapistId = req.user._id; // because this is the therapist controller

      await Rooms.findOne({ _id: roomId })
        .then((docs) => {
          if (docs) {
            clientId = docs.ClientId;
          }
        })
        .catch((err) => {
          if (err) {
            console.log(err);
          }
        });

      const newChat = {
        RoomId: roomId,
        SpokesPerson: "System",
        Message: "This session ended",
      };

      try {
        chatSchema.validateAsync(newChat);

        Chats(newChat).save((err, docs) => {
          if (err) {
            console.log(err);
            return res.status(500).send();
          }

          // has to be sent back to both client and therapist
          socket.to(clientId).emit("session_ended", docs);
          Io.to(therapistId).emit("session_ended", docs); // Io.to().emit() because a socket won't broadcast to itself (you can make it to but no need)
        });  
      } catch (error) {
        res.status(500).send(error.details[0].message);
      }
      
    });

    const wentOffline = () => {
      // get all rooms that this person participates in
      Rooms.find({ TherapistId: req.user._id })
        .then(async (room_docs) => {
          for (let index = 0; index < room_docs.length; index++) {
            const room = room_docs[index];
            socket.to(room.ClientId).emit("wentOffline", room._id);
          }
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    };

    // this code alerts all users that this person has gone offline
    socket.on("disconnect", wentOffline);

    // i kill the listener so for every new connection its a new listener
    Io.removeAllListeners("connection");
  });

  // retrieve all the rooms the current user is in
  if (req.user.isTherapist) {
    Rooms.find({ TherapistId: req.user._id })
      .then(async (rooms) => {
        const loop = async (_) => {
          for (let index = 0; index < rooms.length; index++) {
            const room = rooms[index];

            await Chats.find({ RoomId: room._id })
              .limit(15)
              .then((chats) => {
                rooms[index].Chats = chats;
              })
              .catch((err) => {
                if (err) console.log(err);
              });

            await Users.findOne({ _id: room.ClientId })
              .then(async (user) => {
                await Clients.findOne({ Email: user.Email })
                  .then((client) => {
                    rooms[index].Username = client.Username;
                    rooms[index].Sex = client.Sex;
                    rooms[index].Display_Picture = client.Display_Picture;
                  })
                  .catch((err) => {
                    if (err) console.log(err);
                  });
              })
              .catch((err) => {
                if (err) console.log(err);
              });
          }
        };

        // Start the function and waits till everything finishes
        await loop();

        // get the user's record from database and send to the frontend useful in the chat page for the profile nav
        await Users.findById(req.user._id)
          .then(async (users_docs) => {
            await Therapists.findOne({ Email: users_docs.Email })
              .then((docs) => {
                req.user.details = docs;
              })
              .catch((err) => {
                if (err) console.log(err);
              });
          })
          .catch((err) => {
            if (err) console.log(err);
          });

        res.render("rooms", {
          rooms_info: rooms,
          userStatus: req.user,
          user: req.user._id,
          pages: req.pages
        });
      })
      .catch((err) => {
        res.send(err);
      });
  } else {
    req.errorMessage =
      "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
    res.redirect(307, "/");
  }
});

Router.get("/clientsList", verify, async (req, res) => {
  console.log(`Request made to : t${req.url}`);

  Users.findOne({ _id: req.user._id })
    .then((docs) => {
      if (docs) {
        var therapistName = docs.First_Name + " " + docs.Last_Name;

        // retrieve all the clients associated with the logged in therapist
        Clients.find({ Assigned_Therapist: therapistName })
          .then((docs) => {
            if (docs) {
              res.render("clientsList", { userStatus: req.user, data: docs, pages: req.pages });
            } else {
              // this will only run is the one above it doesn't
              res.render("clientsList", { userStatus: req.user, pages: req.pages });
            }
          })
          .catch((err) => {
            if (err) console.log(err);
          });
      } else {
        // this will only run is the one above it doesn't
        res.render("clientsList", { userStatus: req.user, pages: req.pages });
      }
    })
    .catch((err) => {
      if (err) console.log(err);
    });
});

const reportSchema = Joi.object({
  TherapistId: Joi.string().required(),
  ClientId: Joi.string().required(),
  Case: Joi.string().required(),
  Case_Description: Joi.string().required(),
});

Router.post("/report", (req, res) => {
  console.log(`Request made to : t${req.url}`);

  Users.findOne({ Email: req.body.clientEmail })
    .then(async (docs) => {
      // removes the email field to replace with id
      delete req.body.clientEmail;

      req.body.ClientId = docs._id.toString();
      try {
        // validate report details
        await reportSchema.validateAsync(req.body);
      
        Reports(req.body).save((err, rData) => {
          if (err) throw err;

          Clients.findOneAndUpdate({ Email: docs.Email }, { // docs is from the users collection
            Status: "pending case",
          })
            .then((c_docs) => {
              return res.status(200).send("Case successfully filed");
            })
            .catch((err) => {
              res.status(400).send("Somthing went wrong");

              return Reports.findByIdAndDelete(rData._id);
            });
        });
      } catch (error) {
        return res.status(400).send(error.details[0].message);
      }
    })
    .catch((err) => {
      if (err) console.log(err);
    });
});

Router.get("/getinfo/:userId", (req, res) => {
  console.log(`Request made to : t${req.url}`);

  Users.findById(req.params.userId)
    .then((docs) => {
      if (docs) {
        Clients.findOne({ Email: docs.Email }).then((c_docs) => {
          if (c_docs) {
            // removes confidential info from the response
            c_docs = {
              First_Name: c_docs.First_Name,
              Last_Name: c_docs.Last_Name,
              Email: c_docs.Email,
              Telephone: c_docs.Telephone,
              Sex: c_docs.Sex,
            };

            res.status(200).send(c_docs);
          } else {
            res.status(401).send("User not found");
          }
        });
      } else {
        res.status(401).send("User not found");
      }
    })
    .catch((err) => {
      res.status(500).send("Sorry something went wrong");
    });
});

// Validation for the casefile
const caseFileSchema = Joi.object({
  RoomId: Joi.string().required(),
  Observation: Joi.string().required(),
  Instruments: Joi.string().required(),
  Recommendation: Joi.string().required(),
  Conclusion: Joi.string().required()
});

Router.post('/addCaseFile', verify, async (req, res) => {
  let data = req.body;

  try {
    await caseFileSchema.validateAsync(req.body);

    CaseFile(req.body).save((err, docs) => {
      if (err) throw err;
  
      res.status(200).send();
    }); 
  } catch (error) {
    return res.status(400).send(error.details[0].message);
  }

});

Router.get('/search/:query', verify, async (req, res) => {
  console.log(`Request made to : t${req.url}`);

  const { query } = req.params;
  const { _id: userId } = req.user;

  let results = [];

  let therapistName;
  await Users.findById(userId)
    .then(docs => {
      if (docs) {
        therapistName = docs.First_Name + ' ' + docs.Last_Name;
      } else {
        return res.status(400).send();
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(400).send("Something isn't right");
    })
  
  await Clients.find({ Assigned_Therapist: therapistName, Username: { $regex: query, $options: 'i' }})
    .then(docs => {
      if (docs.length > 0) {
        docs.forEach(doc => {
          // push returns the new length of the array
          results.push({
            Username: doc.Username,
            Display_Picture: doc.Display_Picture,
            Sex: doc.Sex,
            Chats: [],
            Email: doc.Email,
          });
        })
      } else {
        return res.status(400);
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(400).send("Something isn't right");
    })  

  const loop = async function () {
    for (let index = 0; index < results.length; index++) {
      
      await Users.findOne({ Email: results[index].Email })
        .then(u_docs => {
          if (u_docs) {
            delete results[index].Email;
            results[index].userId = u_docs._id;
          } else {
            return res.status(400).send();
          }
        })
        .catch(err => {
          console.log(err);
          return res.status(400).send("Something isn't right");
        })
      
    }
  }

  await loop();
    
  const loop1 = async function () {
    for (let index = 0; index < results.length; index++) {
      await Rooms.findOne({ ClientId: results[index].userId, TherapistId: userId })
        .then(docs => {
          if (docs) {
            results[index]._id = docs._id;
          } else {
            return res.status(400);
          }
        })
        .catch(err => {
          console.log(err);
          return res.status(400).send("Something isn't right");
        })
    }
  }

  await loop1();

  const loop2 = async function () {
    for (let index = 0; index < results.length; index++) {
      await Chats.find({ RoomId: results[index]._id })
        .sort({ _id: -1 })
        .limit(1)
        .then(c_docs => {
          if (c_docs.length > 0) {
            results[index].Chats = c_docs;
          }
        })
        .catch(err => {
          console.log(err);
          return res.status(400).send("Something isn't right");
        })
    }
  }

  await loop2();

  res.status(200).send(results);

});

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

Router.get("/resetpwd", (req, res) => {
  res.redirect("../resetpwd");
})

module.exports = Router;
