const mongoose = require('mongoose');

const caseFileSchema = mongoose.Schema({
  'RoomId': {
    type: String,
    required: true
  },
  'Observation': {
    type: String,
    required: true
  },
  'Instruments': {
    type: String,
    required: true
  },
  'Recommendation': {
    type: String,
    required: true
  },
  'Conclusion': {
    type: String,
    required: true
  }
}, { timestamps: true });

const caseFile = mongoose.model('casefile', caseFileSchema);

module.exports = caseFile;
