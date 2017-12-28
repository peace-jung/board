const mongoose = require('mongoose');

boardSchema = mongoose.Schema({
  email: String,
  name: String,
  title: String,
  context: String,
  comments: [{
    email: String,
    name: String,
    context: String,
    date: { type: Date, default: Date.now },
    recomments: [{
      email: String,
      name: String,
      context: String,
      date: { type: Date, default: Date.now }
    }]
  }],
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('board', boardSchema);