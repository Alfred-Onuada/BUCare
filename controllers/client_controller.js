const Chats = require('./../models/chat');
const Rooms = require('./../models/room');

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
    
    console.log(`Request made to : c${req.url}`);

    Io.on('connection', (socket) => {

        // Io tags the on('connection') event to itself with a callback containing the connected socket so for every new socket that connects it 
        // attaches the connection event multiple time and fires again for all the old ones and the new ones. So i kill the event after it has finished below
    
        socket.join(req.user._id.toString()); // rooms have to be strings
            
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
    if (req.user.isClient) {
        Rooms.find({ ClientId: req.user._id })
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

// the therapist doesnt actually need the register route
Router.get('/users/register', (req, res) => {

    console.log("Here");

    res.redirect('../users/register');

})


module.exports = Router;