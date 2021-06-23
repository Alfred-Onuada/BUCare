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
        min: 8,
        required: true
    },
    'isAdmin' : {
        type: Boolean,
        default: false,
    },
    'isTherapist' : {
        type: Boolean,
        default: false,
    },
    'isClient' : {
        type: Boolean,
        default: false,
    },
    'Unique_Code' : {
        type: String,
        required: true
    },
}, { timestamps: true });

const user = mongoose.model('user', userSchema); // table initializatiion, the name of the table will be users

module.exports = user;