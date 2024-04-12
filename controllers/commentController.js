const Comment = require("../models/comment");
const express = require("express");
const app = express();
require("dotenv").config();
app.use(express.json());

exports.addComment = async (req, res) => {
  const { message, time } = req.body;
  const { reviewId } = req.params;
  try {
    const comments = await Comment.create({
      message,
      time,
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
  const { reviewId } = req.params;
  try {
    const comments = await Comment.find({ review: reviewId })
      .populate("user", "displayName")
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
