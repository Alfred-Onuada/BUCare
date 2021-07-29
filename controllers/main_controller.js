
const Users = require('./../models/user');

const Joi = require('@hapi/joi');

const verify = require('./auths/verify');

const Io = require("./../main");

module.exports = (app) => {

    app.get('/', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index");

    });

    app.get('/index', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index");

    });

    app.get('/about', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("about");

    });

    app.get('/common', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("common");

    });

    app.get('/contact', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("contact");

    });

    app.get('/services', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index");

    });

    app.get('/login', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("login");

    });

    // when the user tries to access routes like chat rooms etc. the verify module will be used to check and return info
    // about the logged in user the only info return is the _id so with this id use the findOne method to find the 
    // docs pertaining to that id and then check if the user is an admin, client or therapist.

    // Users.findOne({ '_id': req.user._id });

    // in order to protect some routes for instance to make sure a user is logged in
    // before accesing them use the middle ware
    // note this code and the middle ware will be inside the individual controllers

    app.get('/all-posts', verify, (req, res) => {
        
        posts = [
            {
                "name": "post 1",
                "author": "Jake"
            },
            {
                "name": "post 2",
                "author": "Kevin"
            }
        ]

        res.send(posts)

    });

    /*
        What i have now to do is to split this code into the appropraite controllers check where that can take effect on the rooms route,
        probably this main controller shouls only handle register, login, logout and as many routes that will render same view 
    */

    app.get('/rooms', verify, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        // checks who is logged in
        Users.findOne({ '_id': req.user._id })
            .then(docs => {

                if (docs.isClient) {
                    return res.redirect(307, '/c/rooms');
                } else {
                    return res.redirect(307, '/t/rooms');
                }

            })
            .catch(err => {
                if (err) throw err;
            })

    });


    // this particular route is going to only be callable when a user registers to match him/her with the therapist in a room
    const roomSchema = Joi.object({
        ClientId: Joi.string().required(),
        TherapistId: Joi.string().required()
    });

    // the app automatically create room no user should be able to do that
    app.post('/create-room', verify, async (req, res) => {

        console.log(`Request made to : ${req.url}`);

        var { error } = await roomSchema.validateAsync(req.body);

        // make a check to validate that the users actually exist using Users.findOne on both user sent
        // in the req.body and also check that one is a client and one is a therapist

        if (error) {
            return res.status(400).send(error.details[0].message);
        } else {
            var newRoom = Rooms(req.body).save((err, docs) => {
                if (err) console.log(err);
                
                
                res.status(200).send("Room created");
            })
        }

    });

}