const mongoose = require('mongoose');

const adminSchema = mongoose.Schema({
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
    'Security_Question' : {
        type: String,
        required: true
    },
    'Answer' : {
        type: String,
        required: true
    },
    'Unique_Code' : {
        type: String,
        required: true
    },
}, { timestamps: true });

const admin = mongoose.model('admin', adminSchema); // table initializatiion, the name of the table will be admin

module.exports = admin