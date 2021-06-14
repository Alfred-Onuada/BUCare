const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    'First_Name' : {
        type: String,
        required: true
    },
    'Last_Name' : {
        type: String,
        required: true
    },
    'Email' : {
        type: String,
        required: true
    },
    'Telephone' : {
        type: String,
        required: true
    },
    'Password' : {
        type: String,
        required: true
    },
    'isAdmin' : {
        type: Boolean,
        required: true
    },
    'isTherapist' : {
        type: Boolean,
        required: true
    },
    'isClient' : {
        type: Boolean,
        required: true
    },
    'Unique_Code' : {
        type: String,
        required: true
    },
}, { timestamps: true });

const user = mongoose.model('user', userSchema); // table initializatiion, the name of the table will be users

module.exports = user;