const mongoose = require('mongoose');

const contactSchema = mongoose.Schema({
  "Title": {
    type: String,
    required: true
  },
  "Form": {
    type: Object,
    required: true
  },
  "Contacts": {
    type: Object,
    required: true
  }
});

const contactModel = mongoose.model('contact', contactSchema);

module.exports = contactModel;