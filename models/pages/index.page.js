const mongoose = require('mongoose');

const indexSchema = mongoose.Schema({
  "Carousel": {
    type: Object,
    required: true
  },
  "Directors_Speech": {
    type: Object,
    required: true
  },
  "Testimonial": {
    type: Object,
    required: true
  },
  "Choose_Confidently": {
    type: Object,
    required: true
  },
  "Blog_Post": {
    type: Object,
    required: true
  },
  "Trusted_Care": {
    type: Object,
    required: true
  }
});

const indexModel = mongoose.model('index', indexSchema);

module.exports = indexModel;