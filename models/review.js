const Mongoose = require("mongoose");
const ReviewSchema = new Mongoose.Schema({
  name : {
    type: String,
    required: true,
  },
  link : {
    type: String,
  },
  images: [{
    type: String,
    required: true,
  }],
  review: {
    type: Boolean,
    required: true,
  },
  user: {
    type: Mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message:{
    type: String,
    required: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Review = Mongoose.model("Review", ReviewSchema);
module.exports = Review;
