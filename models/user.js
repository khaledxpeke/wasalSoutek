const Mongoose = require("mongoose");
const UserSchema = new Mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin","client"],
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  facebookId: { 
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = Mongoose.model("User", UserSchema);
module.exports = User;
