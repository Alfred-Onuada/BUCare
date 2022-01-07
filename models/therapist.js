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
    'Sex' : {
        type: String,
        required: true
    },
    'Specialization' : {
        type: Array,
        required: true
    },
    'Education_Level' : {
        type: Array,
        required: true
    },
    'Brief_Bio': {
        type: Array, 
    },
    'isSubAdmin': {
        type: Boolean,
        default: false
    },
    'Role': {
        type: String
    },
    'Qualifications' : {
        type: Array
    }, 
    'Associations' : {
        type: Array
    },
    'Approach_To_Therapy': {
        type: String
    },
    'Display_Picture' : {
        type: Buffer
    },
    'Average_Rating' : {
        type: Number
    },
    'Disabled' : {
        type: Boolean,
        default: false
    },
    'Rating_Respondents' : {
        type: Number
    },
}, { timestamps: true });

const therapist = mongoose.model('therapist', therapistSchema); // table initializatiion, the name of the table will be therapists

module.exports = therapist;