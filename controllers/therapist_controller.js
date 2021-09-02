// retriving all the models
const Chats = require('./../models/chat');
const Rooms = require('./../models/room');
const Clients = require('./../models/client');
const Users = require('../models/user');
const Reports = require('../models/report');

// Initialize Packages
const Router = require('express').Router();
const Io = require("./../main");
const Joi = require('@hapi/joi');

// verification route
const verify = require('./auths/verify');

const chatSchema = Joi.object({
    RoomId: Joi.string().required(),
    SpokesPerson: Joi.string().required(),
    Message: Joi.string().required()
});

Router.get('/rooms', verify, (req, res) => {
    
    console.log(`Request made to : t${req.url}`);

    Io.on('connection', (socket) => {

        // Io tags the on('connection') event to itself with a callback containing the connected socket so for every new socket that connects it 
        // attaches the connection event multiple time and fires again for all the old ones and the new ones. So i kill the event after it has finished below
    
        socket.join(req.user._id.toString()) // rooms have to be strings
            
        if (socket.rooms.has(req.user._id.toString())) {
            Io.to(socket.id).emit("ack_rooms", "success");
        } else {
            Io.to(socket.id).emit("ack_rooms", "failed");
        }

        socket.on('chat_message', async function (data) {

            var { errors } = await chatSchema.validateAsync(data);

            if (errors) {

                // i dont think you can modify the headers again this may not be correct

                return res.status(400).send(error.details[0].message);
            } else {

                var newMsg = Chats(data).save((err, chat_docs) => {

                    if (err) {
                        console.log(err);
                    } else {

                        Rooms.findOne({ _id: data.RoomId })
                            .then(room_docs => {

                                if ( room_docs.TherapistId == data.SpokesPerson ) {
                                    data.reciever = room_docs.ClientId;
                                } else {
                                    data.reciever = room_docs.TherapistId;
                                }

                                data.ChatId = chat_docs._id;

                                socket.to(data.reciever).emit('msg', data);
                            })
                            .catch(err => {
                                console.log(err);
                            })

                    }

                });

            }

        })

        socket.on("message_status", (data) => {
            
            Chats.findByIdAndUpdate(data.ChatId.toString(), { Status: data.status })
                .then(docs => {
                    // emit an event so you can update the ui to show the message has been deleivered
                })
                .catch(err => {
                    console.log(err);
                })
    
        })
        
        // i kill the listener so for every new connection its a new listener
        Io.removeAllListeners("connection");
    
    });

    // retrieve all the rooms the current user is in
    if (req.user.isTherapist) {
        Rooms.find({ TherapistId: req.user._id })
        .then(rooms => {

            res.render('chat_room', {rooms_info: rooms, user: req.user._id});

        })
        .catch(err => {
            res.send(err)
        })
    } else {
        res.redirect(307, '/');
    }

});

Router.get('/clientsList', verify, async (req, res) => {

    console.log(`Request made to : t${req.url}`);

    Users.findOne({ _id: req.user._id })
        .then(docs => {
            if (docs) {
                var therapistName = docs.First_Name + " " + docs.Last_Name;

                // retrieve all the clients associated with the logged in therapist
                Clients.find({ Assigned_Therapist: therapistName })
                    .then(docs => {
                        if (docs) {
                            res.render('clientsList', { userStatus: req.user, data: docs });
                        } else {
                            // this will only run is the one above it doesn't
                            res.render('clientsList', {userStatus: req.user});
                        }
                    })
                    .catch(err => {
                        if (err) console.log(err);
                    })
            } else {
                // this will only run is the one above it doesn't
                res.render('clientsList', {userStatus: req.user});

            }
        })
        .catch(err => {
            if (err) console.log(err);
        })

});


const reportSchema = Joi.object({
    TherapistId: Joi.string().required(),
    ClientId: Joi.string().required(),
    Case: Joi.string().required(),
    Case_Description: Joi.string().required()
});

Router.post('/report', (req, res) => {

    Clients.findOne({ Email: req.body.clientEmail })
        .then(async (docs) => {

            // removes the email field to replace with id
            delete req.body.clientEmail;

            req.body.ClientId = docs._id.toString();
            try {
        
                // validate report details
                const { error } = await reportSchema.validateAsync(req.body);
                if (error) {
                    return res.status(400).send(error.details[0].message);
                } else {
        
                    Reports(req.body).save((err, rData) => {
        
                        if (err) throw err;
                        
                        Clients.findByIdAndUpdate(req.body.ClientId, { Status: 'pending case' })
                            .then(docs => {
                                return res.status(200).send("Case successfully filed");
                            })
                            .catch(err => {
                                res.status(400).send("Somthing went wrong");

                                return Reports.findByIdAndDelete(rData._id);
                            })
        
                    });
        
                }
        
            } catch (error) {
                return console.log(error);
            }
        })
        .catch(err => {
            if (err) console.log(err)
        });

});

// This makes sure all normal routes called from the client route c/ will redirect backwards
Router.get('/', (req, res) => {

    res.redirect('../');

})

Router.get('/index', (req, res) => {

    console.log("Here");

    res.redirect('../index');

})

Router.get('/about', (req, res) => {

    console.log("Here");

    res.redirect('../about');

})

Router.get('/contact', (req, res) => {

    console.log("Here");

    res.redirect('../contact');

})

Router.get('/services', (req, res) => {

    console.log("Here");

    res.redirect('../services');

})

Router.get('/users/login', (req, res) => {

    console.log("Here");

    res.redirect('../users/login');

})

Router.get('/users/logout', (req, res) => {

    console.log("Here");

    res.redirect('../users/logout');

})

module.exports = Router;