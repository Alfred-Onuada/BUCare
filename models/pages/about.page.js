const mongoose = require('mongoose');

const aboutUsSchema = mongoose.Schema({
  "Title": {
    type: String,
    required: true
  },
  "First_Section": {
    type: Object,
    required: true
  },
  "Our_Services": {
    type: Object,
    required: true
  },
  "What_We_Do": {
    type: Object,
    required: true
  },
  "What_We_Offer": {
    type: Object,
    required: true
  },
  "FaQs": {
    type: Object,
    required: true
  }
});

const aboutUsModel = mongoose.model('aboutUs', aboutUsSchema);

module.exports = aboutUsModel;