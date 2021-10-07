const Users = require('./../../models/user');
const Therapists = require('./../../models/therapist');
const Clients = require('./../../models/client');

const multer = require('multer'); // handles file upload via AJAX
const sharp = require('sharp'); // used for image resizing to save space

function updateProfile (req, res) {

    console.log(`Request made to : ${req.url}`);

    const data = req.body;

    // prevents users from updating fields that they are not suppose to
    const editableFields = ['First_Name', 'Last_Name', 'Username', 'Telephone', 'Date_of_Birth', 'Age', 'Sex'];

    if (!editableFields.includes(req.body.affectedField)) {
        return res.status(401).send("Invalid update request");
    }

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

// initializing a storage space for uploaded files (images in this case)
const displayPictureStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './assets/media/imgs/uploads/')
    }, // where to store the file, cb means callback

    filename: (req, file, cb) => {
        // storing the file name with the user's unique id
        const fileName = `displayPicture - ${req.user._id}`;

        const imageRegex = /image\//;
        const mimeType = file.mimetype.replace(imageRegex, '');

        cb(null, fileName + '.' + mimeType);
    } // what name to store the file with, cb means callback
})


// parser for the picture upload using multer
const displayPictureUpload = multer({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5mb max
    storage: displayPictureStorage
}).single('displayPhoto'); // name of the field from the AJAX request

function updatePhoto (req, res) {

    console.log(`Request made to : ${req.url}`);

    // calling this function is essentially the entire upload logic
    displayPictureUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) { // if an error occured while uploading
            console.log(err)
            return res.status(500).send("file Upload failed")
        }

        const uploadPath = '../media/imgs/uploads/';
        const finalPath = uploadPath + req.file.filename;


        /*

        Okay really nice upload logic

        -this already handles overwriting old files as a user only has one particular way his or her photos can be stored

        ....

        -add logic to resize photo using sharp
        -save photo to database
        -add all the preloaders and error handling to the front end
        -also when a new photo is upload since the path doesn't change, using front end JS refresh the element so the new photo can show

        */


        // if everything goes well
        return res.status(200).send(finalPath);

    })
    
}

module.exports = {
    updatePhoto: updatePhoto,
    updateProfile: updateProfile
}