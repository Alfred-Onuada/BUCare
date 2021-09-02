const mongoose = require('mongoose');

const reportSchema = mongoose.Schema({
    'ClientId' : {
        type: String,
        required: true
    },
    'TherapistId' : {
        type: String,
        required: true
    },
    'Case': {
        type: String,
        required: true
    },
    'Case_Description': {
        type: String,
    }
}, { timestamps: true });

const report = mongoose.model('report', reportSchema); // table initializatiion, the name of the table will be reports

module.exports = report;