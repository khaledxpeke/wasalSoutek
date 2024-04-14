const Mongoose = require("mongoose");
const UserSchema = new Mongoose.Schema({
  email: {
    type: String,
    // required: true,
  },
  role: {
    type: String,
    enum: ["admin","client"],
    required: true,
  },
  displayName: {
    type: String,
  },
  phone: {
    type: String,
  },
  token: {
    type: String, 
  },
  password: {
    type: String,
  },
  facebookId: { 
    type: String,
  },
  image:{
    type: String,
    default: "user.png",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = Mongoose.model("User", UserSchema);
module.exports = User;
