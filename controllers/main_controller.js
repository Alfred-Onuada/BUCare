
const Users = require('./../models/user');

const verify = require('./auths/verify');

module.exports = (app) => {

    app.get('/', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("home");

    });

    app.get('/login', (req, res)=> {

        console.log(`Request made to : ${req.url}`);

        res.render("login");

    });

    app.get('/register', (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("register");

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
}