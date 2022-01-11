const mongoose = require('mongoose');

const clientSchema = mongoose.Schema({
    'First_Name' : {
        type: String,
    },
    'Last_Name' : {
        type: String,
    },
    'Username' : {
        type: String,
        required: true
    },
    'Email' : {
        type: String,
        required: true
    },
    'Telephone' : {
        type: String,
    },
    'Password' : {
        type: String,
        required: true
    },
    'Date_of_Birth' : {
        type: String,
    },
    'Age' : {
        type: Number,
    },
    'Sex': {
        type: String,
        required: true
    },
    'Case' : {
        type: String,
    },
    'Assigned_Therapists' : {
        type: Array,
    },
    'Status': {
        type: String,
        default: "active"
    },
    'Display_Picture': {
        type: Buffer
    },
    'Disabled' : {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

const client = mongoose.model('client', clientSchema); // table initializatiion, the name of the table will be clients

module.exports = client;