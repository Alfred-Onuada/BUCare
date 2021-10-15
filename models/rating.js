const mongoose = require('mongoose');

const ratingSchema = mongoose.Schema({
  'ClientId' : {
    type: String,
    required: true
  },
  'TherapistId' : {
    type: String,
    required: true
  },
  'Rating' : {
    type: Number,
    required: true
  },
}, { timestamps: true })

const rating = mongoose.model('rating', ratingSchema);

module.exports = rating;