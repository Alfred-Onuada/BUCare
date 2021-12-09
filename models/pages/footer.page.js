const mongoose = require('mongoose');

const footerSchema = mongoose.Schema({
  "Intro": {
    type: Array,
    required: true
  },
  "Definition": {
    type: Array,
    required: true
  }
});

const footerModel = mongoose.model('footer', footerSchema);

module.exports = footerModel;