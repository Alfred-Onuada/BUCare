const Users = require("./../../models/user");
const Therapists = require("./../../models/therapist");
const Clients = require("./../../models/client");

function updateProfile(req, res) {
  console.log(`Request made to : ${req.url}`);

  const data = req.body;

  // prevents users from updating fields that they are not suppose to
  const editableFields = [
    "First_Name",
    "Last_Name",
    "Username",
    "Telephone",
    "Date_of_Birth",
    "Age",
    "Sex",
    "Display_Picture",
  ];

  if (!editableFields.includes(req.body.affectedField)) {
    return res.status(400).send("Invalid update request");
  }

  Users.findOne({ _id: data.userId })
    .then((users_docs) => {
      const userEmail = users_docs.Email;

      // even is the specified field is not on the users model it still gets to the then block because it didnt fail
      // it just didnt edit any field

      // the $set operator allows a variable field to be update (you don't have to hardcode the field value)
      Users.findByIdAndUpdate(data.userId, {
        $set: ((o = {}), (o[data.affectedField] = data.newValue), o),
      })
        .then((info) => {
          if (users_docs.isTherapist) {
            Therapists.findOneAndUpdate(
              { Email: userEmail },
              { [data.affectedField]: data.newValue } 
              // lol😂😂, rather than write complex mongoose code to use variable field name, Js builtin symbols does the trick
            )
              .then((info) => {
                res.status(200).send(data.newValue);
              })
              .catch((err) => {
                if (err) console.log(err);

                res.status(500).send("Update Failed");
              });
          } else {
            Clients.findOneAndUpdate(
              { Email: userEmail },
              { $set: ((o = {}), (o[data.affectedField] = data.newValue), o) }
            )
              .then((info) => {
                res.status(200).send(data.newValue);
              })
              .catch((err) => {
                if (err) console.log(err);

                res.status(500).send("Update Failed");
              });
          }
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
}

async function updatePhoto(req, res) {
  console.log(`Request made to : ${req.url}`);

  const file = req.files.displayPhoto;

  if (file.length > 1 || file.length === 0) {
    return res.status(400).send("please select only one file");
  }

  let maxFileSize = 5 * 1024 * 1024;
  if (file.size > maxFileSize) {
    return res.status(400).send("File is too big");
  }

  let allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).send("Only jpg, png and jpeg files are allowed");
  }

  let fileBufferData = Buffer.from(file.data, "base64").toString("base64");
  let dbReadyFile = `data:${file.mimetype};charset=utf-8;base64,${fileBufferData}`;

  // i'm harnessing the function i had already written above
  req.body.newValue = dbReadyFile;

  return updateProfile(req, res);
}

module.exports = {
  updatePhoto: updatePhoto,
  updateProfile: updateProfile,
};
