const Comment = require("../models/comment");
const express = require("express");
const app = express();
require("dotenv").config();
app.use(express.json());

exports.addComment = async (req, res) => {
  const { message } = req.body;
  const { reviewId } = req.params;
  let show = false;
  try {
    const comments = await Comment.create({
      message,
      show,
      user: req.user.user._id,
      review: reviewId,
    });
    res.status(201).json({ comments, message: "Comment added successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getComments = async (req, res) => {
  const { reviewId, page } = req.params;
  const limit = 10;
  try {
    const comments = await Comment.find({ review: reviewId })
      .populate("user", "displayName image")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.status(200).json(comments);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userRole = req.user.user.role;
  try {
    if (userRole == "client") {
      const comment = await Comment.findById(commentId);
      if (comment.user.toString() !== req.user.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      } else {
        await Comment.findByIdAndDelete(commentId);
      }
    } else {
      await Comment.findByIdAndDelete(commentId);
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
