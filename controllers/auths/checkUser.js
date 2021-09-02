const Users = require('./../../models/user');

//  this module is a middle ware used to verify if a user is logged in
const jwt = require('jsonwebtoken');

module.exports =  async function(req, res, next) {
    // get back the token you created on login and verify
    const token = req.cookies.tk;

    // if it doesnt exist
    if(!token) {
        req.userInfo = null;
    }

    try {
        
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);

        // create a userInfo object on the request object when token is valid
        req.userInfo = verified;

        // if for any reason your info no longer exists on the db this makes sure your userInfo object is set to null
        await Users.findOne({ '_id': req.userInfo._id })
            .then(docs => {
                if (docs == null) { 
                    req.userInfo = null;
                } else {
                    //  only these two for now as the client's nav is always basic
                    req.userInfo.isTherapist = docs.isTherapist;
                    req.userInfo.isAdmin = docs.isAdmin
                }
            })
            .catch(err => {
                if (err) throw err
            })

    } catch (error) {

        // if token is expired
        if (error) {
            req.userInfo = null;
        }

    }

    // no matter what the route still opens it just tell it you dont have an accout so it properly displays your nav
    next();
}