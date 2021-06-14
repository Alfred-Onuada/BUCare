const mongoose = require('mongoose');

const therapistSchema = mongoose.Schema({
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
    'Date_of_Birth' : {
        type: String,
        required: true
    },
    'Specialization' : {
        type: Array,
        required: true
    },
    'isVerified' : {
        type: Boolean,
        required: true,
    },
    'Date_of_Birth' : {
        type: String,
        required: true
    },
    'Unique_Code' : {
        type: String,
        required: true
    },
}, { timestamps: true });

const therapist = mongoose.model('therapist', therapistSchema); // table initializatiion, the name of the table will be therapists

module.exports = therapist;