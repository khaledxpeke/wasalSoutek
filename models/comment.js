const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  show: {
    type: Boolean,
    default: true,
  },
  time: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;