
const Users = require('./../models/user');

module.exports = (app) => {

    // this gives each user a unique interface as from here the code is handed over to the controllers made for each user.
    // it searches for what user is currently logged in.

    // Users.find({ 'First_Name': });

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

    })


}