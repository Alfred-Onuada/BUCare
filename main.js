// initialize access to .env files for enviroment variables
require('dotenv').config();

// Initialize packages required for the server
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');

// Initializing server with http
const http = require('http');
const server = http.createServer(app);

// Using socket Io for web sockets
// const { Server } = require("socket.io");
// const io = new Server(server);

// when you start working with socket this will be used to export the server socket to other controllers
// module.exports = io;

const uri = process.env.DB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
    .then((result) => {

        const port = process.env.PORT || 3000; 
        console.log("Starting app...");

        console.log("Database Connection Succesful.");

        server.listen(port);
        console.log(`App is now active on port ${port}`);

    })
    .catch((err) => {
        console.log(err);
    })

    
// set a template engine
app.set('view engine', 'ejs');

// set a middleware for handling post request so i dont have to always define it
app.use(bodyParser.urlencoded({ extended: false }));

// set a middleware for handling cookies sent from request
app.use(cookieParser());

// set static files path
app.use(express.static('./assets'));

// this enables me to send Json output not always string
app.use(express.json());

// adding authetication middlewares
const registerRoute = require('./controllers/auths/auth');

// using those middlewares, this is where that router functions come in all the code directed to /users/ will use the defined routes in the auth
app.use('/users', registerRoute);

var mainController = require('./controllers/main_controller');
mainController(app);