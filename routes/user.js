const mongoose = require('mongoose');

userSchema = mongoose.Schema({
  email: String,
  password: String,
  name: String
});

module.exports = mongoose.model('user', userSchema);