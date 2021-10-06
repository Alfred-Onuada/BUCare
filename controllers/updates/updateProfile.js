const Users = require('./../../models/user');
const Therapists = require('./../../models/therapist');
const Clients = require('./../../models/client');

const multer = require('multer'); // handles file upload via AJAX
const sharp = require('sharp'); // used for image resizing to save space

function updateProfile (req, res) {

    console.log(`Request made to : ${req.url}`);

    const data = req.body;

    Users.findOne({ _id: data.userId })
        .then(users_docs => {
            const userEmail = users_docs.Email;

            // even is the specified filed is not on the users model it still gets to the then block because it didnt fail
            // it just didnt edit any field

            // the $set operator allows a variable field to be update (you don't have to hardcode the field value)
            Users.findByIdAndUpdate(data.userId, {$set: (o = {}, o[data.affectedField] = data.newValue, o)})
                .then(info => {
                    if (users_docs.isTherapist) {
                        
                        Therapists.findOneAndUpdate({ Email: userEmail}, {$set: (o = {}, o[data.affectedField] = data.newValue, o)})
                            .then(info => {
                                res.status(200).send("Update Successful");
                            })
                            .catch(err => {
                                if (err) console.log(err);
        
                                res.status(500).send("Update Failed");
        
                            })

                    } else {

                        Clients.findOneAndUpdate({ Email: userEmail}, {$set: (o = {}, o[data.affectedField] = data.newValue, o)})
                            .then(info => {

                                res.status(200).send("Update Successful");
                            })
                            .catch(err => {
                                if (err) console.log(err);
        
                                res.status(500).send("Update Failed");
        
                            })

                    }
                })
                .catch(err => {
                    if (err) console.log(err);

                    res.status(500).send("Update Failed");

                })

        })
        .catch(err => {
            if (err) console.log(err);

            res.status(500).send("Update Failed");

        })
}

function updatePhoto (req, res) {

    console.log(`Request made to : ${req.url}`);

    console.log(req.headers, req.body);

    const upload = multer({ 
        limits: { fileSize: 5 * 1024 * 1024 } // filesize <= 5mb
    }).single('file'); // name of the field on the data sent from AJAX, for multiple file see docs

    upload(req, res, async function(err) {
        // console.log(req.file);

    })
    
}

module.exports = {
    updatePhoto: updatePhoto,
    updateProfile: updateProfile
}