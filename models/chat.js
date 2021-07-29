const mongoose = require('mongoose');

const chatSchema = mongoose.Schema({
    'RoomId': {
        type: String,
        required: true
    },
    'SpokesPerson': {
        type: String,
        required: true
    },
    'Message': {
        type: String,
        required: true
    },
    'Status': {
        type: String,
        required: true,
        default: "sent"
    }
}, { timestamps: true });

const chatModel = mongoose.model('chat', chatSchema);
module.exports = chatModel;