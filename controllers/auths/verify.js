const Users = require("./../../models/user");
const Clients = require("../../models/client");
const getPageInfo = require('../../models/helpers/pageInfo.helper.js');

//  this module is a middle ware used to verify if a user is logged in
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // get back the token you created on login and verify
  const token = req.cookies.tk;

  // if it doesnt exist
  if (!token) {
    req.errorMessage =
      "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
    return res.redirect(307, "/");
  }

  try {
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);

    // create a user object on the request object when token is valid
    req.user = verified;

    // this appends the signed in user's identity
    Users.findOne({ _id: req.user._id })
      .then(async (docs) => {
        if (docs && docs.Disabled) {
          return res
            .status(401)
            .send(
              "Sorry, this account has been temporarily suspended, for more info reach out to our customer support"
            );
        }

        if (docs) {
          // only one can be true, the rest will be false
          req.user.isAdmin = docs.isAdmin;
          req.user.isClient = docs.isClient;
          req.user.isTherapist = docs.isTherapist;
          req.user.Sex = docs.Sex;

          if (req.user.isTherapist || req.user.isAdmin) {
            await Users.findOne({ Email: docs.Email })
              .then((extradocs) => {
                req.user.Name = extradocs.First_Name != null ? extradocs.First_Name : extradocs.Email;
              })
              .catch((err) => console.log(err));
          } else if (req.user.isClient) {
            await Clients.findOne({ Email: docs.Email })
              .then((extradocs) => {
                req.user.Name = extradocs.Username != null ? extradocs.Username : extradocs.Email;
              })
              .catch((err) => console.log(err));
          }

          // retrieves the information to be displayed on the pages
          req.pages = await getPageInfo(req.url);

          next();
        } else {
          // this also makes sure that is for any reason you no longer exist on the database you are also logged out
          req.errorMessage =
            "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
          return res.redirect(307, "/");
        }
      })
      .catch((err) => {
        if (err) console.log(err);
        res.status(500).send("Oops! page edit failed, try again later");
      });
  } catch (error) {
    // if token is expired
    // i need to send back a user state because of the navbar
    req.errorMessage =
      "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page.";
    res.status(401).render("index", {
      userStatus: req.user,
      errorMessage: req.errorMessage,
      pages: req.pages
    });
  }
};
