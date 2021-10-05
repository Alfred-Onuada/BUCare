
const Users = require('./../models/user');
const Rooms = require('./../models/room');
const Therapists = require('./../models/therapist');
const Clients = require('./../models/client');

const Joi = require('@hapi/joi');

const verify = require('./auths/verify');
const checkUser = require('./auths/checkUser');

const { v4: uuidV4 } = require('uuid');
 
const Io = require("./../main");

// checkuser simply returns information about the logged in user, it doesn't protect the route
module.exports = (app) => {

    app.get('/', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index", { userStatus: req.userInfo, errorMessage: req.errorMessage });

    });

    app.get('/index', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        res.render("index", { userStatus: req.userInfo, errorMessage: req.errorMessage });

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
                } else if (docs && docs.isTherapist) {
                    return res.redirect(307, '/t/rooms');
                } else {
                    req['errorMessage'] = "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page."
                    return res.redirect(307, '/');
                }

            })
            .catch(err => {
                if (err) throw err;
            })

    });

    // This routes are here because the header file doesnt explicitly specify /a or /t in any of it urls so these routes 
    //checks the user's details and appends the appropraite prefix
    app.get('/clientsList', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        if (req.userInfo.isTherapist) {
            return res.redirect('/t/clientsList');
        } else {
            // send them back to the homepage
            req['errorMessage'] = "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page."
            return res.redirect('/');
        }
    });

    app.get('/summary', checkUser, (req, res) => {

        console.log(`Request made to : ${req.url}`);

        if (req.userInfo.isAdmin) {
            return res.redirect('/a/summary');
        } else {
            req['errorMessage'] = "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page."
            return res.redirect('/');
        }
    });
    
    app.put('/leaveRoom', (req, res) => {
        
        console.log(`Request made to : ${req.url}`);

        // this simply changes the room status to false
        Rooms.findByIdAndUpdate(req.body.RoomId, {Status: false})
            .then(docs => {
                res.status(200).send("Success");
            })
            .catch(err => {
                if (err) console.log(err);
            })
    })

    app.put('/updateProfile', (req, res) => {

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

}