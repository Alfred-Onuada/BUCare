const mongoose = require('mongoose');

const teamSchema = mongoose.Schema({
  "Title": {
    type: String,
    required: true
  },
  "We_Care": {
    type: Object,
    required: true
  },
  "Our_Admins": {
    type: Object,
    required: true
  }
});

const teamModel = mongoose.model('team', teamSchema);

module.exports = teamModel