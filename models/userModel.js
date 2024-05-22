const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  fullname: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  createdOn: {
    type: Date,
    default: new Date().getTime(),
  },
});
module.exports = mongoose.model("User", userSchema);
