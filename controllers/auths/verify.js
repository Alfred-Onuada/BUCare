const Users = require('./../../models/user');

//  this module is a middle ware used to verify if a user is logged in
const jwt = require('jsonwebtoken');

module.exports =  function(req, res, next) {
    // get back the token you created on login and verify
    const token = req.cookies.tk;

    // if it doesnt exist
    if(!token) {
        req.errorMessage = "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page."
        return res.redirect(307, '/');
    }

    try {
        
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);

        // create a user object on the request object when token is valid
        req.user = verified;

        // this appends the signed in user's identity
        Users.findOne({ _id: req.user._id })
            .then(docs => {
                if (docs) {

                    // only one can be true, the rest will be false
                    req.user.isAdmin = docs.isAdmin;
                    req.user.isClient = docs.isClient;
                    req.user.isTherapist = docs.isTherapist;
                    req.user.Sex = docs.Sex;                   

                    next();

                } else {
                    // this also makes sure that is for any reason you no longer exist on the database you are also logged out
                    req.errorMessage = "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page."
                    return res.redirect(307, '/');
                }
            })
            .catch(err => {
                if (err) console.log(err)
            })

    } catch (error) {

        // if token is expired
        if (error) {
            // i need to send back a user state because of the navbar
            req.errorMessage = "Unauthorized access to the requested page. <br> If you believe this to be an error please file a report on the contact us page."
            res.status(401).render('index', { userStatus: req.user, errorMessage: req.errorMessage });
        }

    }
}