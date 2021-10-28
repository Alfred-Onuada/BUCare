const Users = require("./../models/user");
const Rooms = require("./../models/room");
const Clients = require('./../models/client');

const Joi = require("@hapi/joi");

const verify = require("./auths/verify");
const checkUser = require("./auths/checkUser");

const Io = require("./../main");

// modules for edits
const { updatePhoto, updateProfile } = require("./updates/updateProfile");

// checkuser simply returns information about the logged in user, it doesn't protect the route
module.exports = (app) => {
  app.get("/", checkUser, (req, res) => {
    console.log(`Request made to : ${req.url}`);

    res.render("index", {
      userStatus: req.userInfo,
      errorMessage: req.errorMessage,
    });
  });

  app.get("/index", checkUser, (req, res) => {
    console.log(`Request made to : ${req.url}`);

    res.render("index", {
      userStatus: req.userInfo,
      errorMessage: req.errorMessage,
    });
  });

  app.get("/about", checkUser, (req, res) => {
    console.log(`Request made to : ${req.url}`);

    res.render("about", { userStatus: req.userInfo });
  });

  app.get("/contact", checkUser, (req, res) => {
    console.log(`Request made to : ${req.url}`);

    res.render("contact", { userStatus: req.userInfo });
  });

  app.get("/services", checkUser, (req, res) => {
    console.log(`Request made to : ${req.url}`);

    res.render("services", { userStatus: req.userInfo });
  });

  /*
        What i have now to do is to split this code into the appropraite controllers check where that can take effect on the rooms route,
        probably this main controller shouls only handle register, login, logout and as many routes that will render same view 
    */

  app.get("/rooms", verify, (req, res) => {
    console.log(`Request made to : ${req.url}`);

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

  // This routes are here because the header file doesnt explicitly specify /a or /t in any of it urls so these routes
  //checks the user's details and appends the appropraite prefix
  app.get("/clientsList", verify, (req, res) => {
    console.log(`Request made to : ${req.url}`);

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
    console.log(`Request made to : ${req.url}`);

    if (req.user.isAdmin) {
      return res.redirect("/a/summary");
    } else {
      req["errorMessage"] =
        "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
      return res.redirect("/");
    }
  });

  app.put("/leaveRoom", verify, (req, res) => {
    console.log(`Request made to : ${req.url}`);

    // this simply changes the room status to false
    Rooms.findByIdAndUpdate(req.body.RoomId, { Status: false })
      .then((docs) => {
        res.status(200).send("Success");
      })
      .catch((err) => {
        if (err) console.log(err);
      });
  });

  app.put("/updateProfile", verify, updateProfile);

  app.put("/updatePhoto", verify, updatePhoto);

  app.get('/video/:roomId/:type', verify, async (req, res) => {
    
    console.log(`Request made to : ${req.url}`);

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

};
