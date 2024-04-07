const Mongoose = require("mongoose");
const ReclamationSchema = new Mongoose.Schema({
  nbReclamations: {
    type: Number,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  images: [{
    type: String,
  }],
  user: {
    type: Mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  messages: [{
    date: {
      type: Date,
      default: Date.now,
    },
    message: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      default: true,
    },
    time: {
      type: String,
      required: true,
    },
    user: {
      type: Mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Reclamation = Mongoose.model("Reclamation", ReclamationSchema);
module.exports = Reclamation;
