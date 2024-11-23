const Mongoose = require("mongoose");
const UserSchema = new Mongoose.Schema({
  email: {
    type: String,
    // required: true,
  },
  role: {
    type: String,
    enum: ["admin", "client"],
    required: true,
  },
  displayName: {
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
  image: {
    type: String,
    default: "uploads\\user.png",
  },
  resetCode: { type: String, default: null },
  resetCodeExpires: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  fcmToken: { type: String },
});

const User = Mongoose.model("User", UserSchema);
module.exports = User;
