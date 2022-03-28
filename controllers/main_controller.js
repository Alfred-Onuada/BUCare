const Users = require("./../models/user");
const Rooms = require("./../models/room");
const Clients = require('./../models/client');
const Therapists = require('./../models/therapist');
const TempUsers = require('./../models/tempUser');
const Chats = require("./../models/chat");

const Joi = require("@hapi/joi");

const verify = require("./auths/verify");
const checkUser = require("./auths/checkUser");

const Io = require("./../main");

// modules for edits
const { updatePhoto, updateProfile } = require("./updates/updateProfile");
const { updateHeader, updateFooter, updateIndex, updateContact, updateAbout, updateTeam, updateTherapist } = require("./updates/updatePages");

// checkuser simply returns information about the logged in user, it doesn't protect the route
module.exports = (app) => {
  app.get("/", checkUser, (req, res) => {
    const errorMessage = req.session.errorMessage || null;
    req.session.errorMessage = null; // clears the message after displaying it once

    res.render("index", {
      userStatus: req.userInfo,
      errorMessage,
      pages: req.pages
    });
  });

  app.get("/index", checkUser, (req, res) => {
    res.redirect(307, "/");
  });

  app.get("/about", checkUser, (req, res) => {
    res.render("about", { userStatus: req.userInfo, pages: req.pages });
  });

  app.get("/contact", checkUser, (req, res) => {
    res.render("contact", { userStatus: req.userInfo, pages: req.pages });
  });

  app.get("/rooms", verify, (req, res) => {
    // checks who is logged in
    Users.findOne({ _id: req.user._id })
      .then((docs) => {
        if (docs && docs.isClient) {
          return res.redirect(307, "/c/rooms");
        } else if (docs && docs.isTherapist) {
          return res.redirect(307, "/t/rooms");
        } else {
          req["errorMessage"] =
            "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
          return res.redirect(307, "/");
        }
      })
      .catch((err) => {
        if (err) throw err;
      });
  });

  app.get('/getMatchingTherapist/:challenge', (req, res) => {
    const challenge = req.params.challenge;

    Therapists.find({ Specialization: challenge })
      .then(docs => {
        let data = [];
        docs.forEach(therapist => {
          data.push(therapist.First_Name + ' ' + therapist.Last_Name);
        })

        res.status(200).send(data);
      })
      .catch(err => {
        if (err) {
          console.error(err.message);
          res.status(500).send();
        }
      })

  });

  // This routes are here because the header file doesnt explicitly specify /a or /t in any of it urls so these routes
  //checks the user's details and appends the appropraite prefix
  app.get("/clientsList", verify, (req, res) => {
    if (req.user.isTherapist) {
      return res.redirect("/t/clientsList");
    } else {
      // send them back to the homepage
      req["errorMessage"] =
        "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
      return res.redirect("/");
    }
  });

  app.get("/summary", verify, (req, res) => {
    if (req.user.isAdmin) {
      return res.redirect("/a/summary");
    } else {
      req["errorMessage"] =
        "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
      return res.redirect("/");
    }
  });

  app.put("/leaveRoom", verify, (req, res) => {
    // this simply changes the room status to false
    Rooms.findByIdAndUpdate(req.body.RoomId, { Status: "left" })
      .then((docs) => {
        res.status(200).send("Success");
      })
      .catch((err) => {
        if (err) console.error(err.message);
      });
  });

  app.post("/loadMoreMessages", verify, async (req, res) => {
    const { roomId, offset } = req.body;

    try {
      const chats = await Chats.find({ RoomId: roomId })
        .sort({ _id: -1 })
        .skip(offset * 15)
        .limit(15)

      const roomInfo = await Rooms.findById(roomId);
    
      if (chats.length) {
        return res.status(200).json({
          chats,
          roomInfo,
          userInfo: {
            id: req.user._id,
            isTherapist: req.user.isTherapist,
            isClient: req.user.isClient
          }
        });
      } else {
        return res.status(400).send("You have reached the end of the conversation");
      }

    } catch (error) {
      console.error(error.message);
      return res.status(500).send("Please refresh the browser and try again something went wrong");
    }

  });

  app.post('/checkVerificationToken', async (req, res) => {
    const { token, email } = req.body;

    await TempUsers.findOne({ Email: email })
      .then(user_info => {
        if (user_info) {

          let currentTime = new Date().getTime();

          // check for expired token
          if (currentTime > user_info.Expires_In) {
            return res.status(400).send("This token is expired, please request a new one");
          }

          // validate token
          if (token !== user_info.Unique_Code) {
            return res.status(400).send("Invalid token");
          }

          // if everything goes well
          if (token === user_info.Unique_Code) {
            return res.status(200).send();
          }

          // this handles any unforseen circumstances
          return res.status(500).send("Something went wrong");
        } else {
          // the reason this is a 500 error is because the user is not the one providing the data
          return res.status(500).send("Something went wrong, try again later");
        }
      })
      .catch(err => {
        console.error(err.message);
        return res.status(500).send("Something went wrong");
      })


  });

  app.put("/updateProfile", verify, updateProfile);

  app.put("/updatePhoto", verify, updatePhoto);

  // this route is only available to the admin
  app.put("/updatePages/:page", verify, (req, res) => {

    const { page } = req.params;

    if (req.user.isAdmin) {

      // sends it to the page specified
      switch (page) {
        case 'header':
          updateHeader(req, res);
          break;
        
        case 'footer':
          updateFooter(req, res);
          break;

        case 'index':
          updateIndex(req, res);
          break;

        case 'contact':
          updateContact(req, res);
          break;
        
        case 'about':
          updateAbout(req, res);
          break;
        
        case 'team':
          updateTeam(req, res);
          break;

        case 'therapist':
          updateTherapist(req, res);
          break;
      
        default:
          return res.status(400).send("Invalid information please make sure your making a valid request");
      }

    } else {
      return res.status(401).send();
    }
  });

  app.get('/video/:roomId/:type', verify, async (req, res) => {
    let details = {
      roomId: req.params.roomId,
      key: process.env.API_KEY_VOIP,
      type: req.params.type,
      name: null
    }

    if (req.user.isClient) {
      await Users.findById(req.user._id)
        .then(async u_docs => {
          if (u_docs) {
             await Clients.findOne({ Email: u_docs.Email })
              .then(docs => {
                if (docs) {
                  details.name = `${docs.Username}`;
                }
              })
          }
        })
      
    } else if (req.user.isTherapist) {
      await Users.findById(req.user._id)
        .then(docs => {
          if (docs) {
            details.name = `${docs.First_Name} ${docs.Last_Name}`;
          }
        })
    }

    res.render('video-chat', { details });
  })

  app.get("/resetpwd", checkUser, (req, res) => {
    // block the admin from visiting the regular reset password route
    if (req.userInfo?.isAdmin) {
      return res.redirect('/a/resetpwd');
    }
    
    res.render("resetpassword", { userStatus: req.userInfo, pages: req.pages })
  })

  app.get("/team", checkUser, (req, res) => {
    res.render("team", { userStatus: req.userInfo, pages: req.pages })
  })

  // this is the 404 error page, it has to be the last route here
  app.get('*', checkUser, (req, res) => {
    res.render("404", { userStatus: req.userInfo, pages: req.pages });
  })

};
