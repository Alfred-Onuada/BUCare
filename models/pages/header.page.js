const mongoose = require('mongoose');

const headerSchema = mongoose.Schema({
  "Office_Hours": {
    type: Array,
    required: true
  },
  "Telephones": {
    type: Array,
    required: true
  },
  "Address": {
    type: Array,
    required: true
  }
});

const headerModel = mongoose.model('header', headerSchema);
module.exports = headerModel;