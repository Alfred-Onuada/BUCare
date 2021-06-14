// Initialize packages required for the server
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require("body-parser");

// Initializing server with http
const http = require('http');
const server = http.createServer(app);

// Using socket Io for web sockets
// const { Server } = require("socket.io");
// const io = new Server(server);

// when you start working with socket this will be used to export the server socket to other controllers
// module.exports = io;

// const uri = "";
// mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
//     // this request above is an asynchronous code using the then am waiting for when it finishes before I start the app
//     .then((result) => {

//         const port = process.env.PORT || 3000; 
//         console.log("Starting app...");

//         server.listen(port);
//         console.log(`App is now active on port ${port}`);

//         console.log("Database Connection Succesful.");

//     })
//     .catch((err) => {
//         console.log(err);
//     })


/*

    REMOVE ME

*/

const port = process.env.PORT || 3000; 
console.log("Starting app...");

server.listen(port);
console.log(`App is now active on port ${port}`);

/*

    REMOVE ME

*/

// set a template engine
app.set('view engine', 'ejs');

// set a middle ware for handling post request so i dont have to always define it
app.use(bodyParser.urlencoded({ extended: false }));

// set static files path
app.use(express.static('./assets'));

var mainController = require('./controllers/main_controller');
mainController(app)