
const Users = require('./../models/user');
const Rooms = require('./../models/room');

const Joi = require('@hapi/joi');

const verify = require('./auths/verify');
const checkUser = require('./auths/checkUser');

const { v4: uuidV4 } = require('uuid');
 
const Io = require("./../main");

// checkuser simply returns information about the logged in user, it doesn't protect the route
module.exports = (app) => {

    app.get('/', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index", { userStatus: req.userInfo });

    });

    app.get('/index', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index", { userStatus: req.userInfo });

    });

    app.get('/about', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("about", { userStatus: req.userInfo });

    });


    app.get('/contact', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("contact", { userStatus: req.userInfo });

    });

    app.get('/services', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("services", { userStatus: req.userInfo });

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

                if (docs && docs.isClient) {
                    return res.redirect(307, '/c/rooms');
                } else if (docs && docs.isClient) {
                    return res.redirect(307, '/t/rooms');
                } else {
                    return res.redirect(307, '/');
                }

            })
            .catch(err => {
                if (err) throw err;
            })

    });

    // video chat routes

    // not sure but this route should just send the meeting link back to the frontend and then it will show in the
    // chat room for you to click on and then have the video chat.
    // app.get('/v', (req, res) => {

    //     console.log(`Request made to : ${req.url}`);

    //     res.redirect(`v-chat/${uuidV4()}`);
    // })

    // app.get('/v-chat/:vid', (req, res) => {

    //     console.log(`Request made to : ${req.url}`);

    //     Io.on('connection', socket => {
    //         socket.on('join-room', (roomId, userId) => {
    //             socket.join(roomId)
    //             socket.broadcast.to(roomId).emit('user-connected', userId)
          
    //             socket.on('disconnect', () => {
    //                 socket.broadcast.to(roomId).emit('user-disconnected', userId)
    //             })
    //         })
    //     })

    //     res.render('video-chat', {RoomID: req.params.vid});
    // })

    // the app automatically create room no user should be able to do that, it will happen once you register and pick a therapist it creates the room for bith of you
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