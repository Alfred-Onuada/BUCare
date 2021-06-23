//  this module is a middle ware used to verify if a user is logged in
const jwt = require('jsonwebtoken');

module.exports =  function(req, res, next) {
    // get back the token you created on login and verify
    const token = req.cookies.tk;

    // if it doesnt exist
    if(!token) {
        return res.status(401).render('register');
    }

    try {
        
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);

        // create a user object on the request object when token is valid
        req.user = verified;
        next();

    } catch (error) {

        // if token is expired
        if (error) {
            res.status(401).render('login');
        }

    }
}