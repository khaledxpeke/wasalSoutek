const Comment = require("../models/comment");
const express = require("express");
const Review = require("../models/review");
const app = express();
require("dotenv").config();
app.use(express.json());

exports.addComment = async (req, res) => {
  const { message } = req.body;
  const { reviewId } = req.params;
  let show = false;
  try {
    const comment = await Comment.create({
      message,
      show,
      user: req.user.user._id,
      review: reviewId,
    });
    const populatedComment = await Comment.findById(comment._id).populate('user');
    res.status(201).json(populatedComment);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.getComments = async (req, res) => {
  const { reviewId, page } = req.params;
  const userId = req.user.user._id;
  const userRole = req.user.user.role;
  const limit = 30;
  try {
    const review = await Review.findById(reviewId).populate("user");
    const comments = await Comment.find({ review: reviewId })
      .populate("user", "displayName image")
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
      const processedComments = comments.map((comment) => {
        let commentDisplayName = comment.user.displayName;
        let commentImage = comment.user.image; 
  
  
        if (review.anonyme) {
          if (
            (userId.toString() !== review.user._id.toString()) && 
            (userRole !== "admin") && 
            (review.user._id.toString() == comment.user._id.toString()) 
          ) {
            commentDisplayName = "Anonyme"; 
            commentImage = "uploads\\anonyme.png"; 
          }
  
          // // For the owner of the review, anonymize the display name for clients and admins
          // if (userId.toString() === review.user._id.toString()) {
          //   commentDisplayName = "Anonyme"; // If the owner posted a comment
          //   commentImage = "uploads\\anonyme.png"; 
          // }
          
        }
  
        return {
          ...comment.toObject(), 
          user: {
            ...comment.user.toObject(),
            displayName: commentDisplayName, 
            image: commentImage, 
          },
        };
      });
  
      res.status(200).json(processedComments);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userRole = req.user.user.role;
  try {
    if (userRole == "client") {
      const comment = await Comment.findById(commentId);
      if (comment.user.toString() !== req.user.user._id.toString()) {
        return res.status(403).json({ message: "Non autorisé" });
      } else {
        await Comment.findByIdAndDelete(commentId);
      }
    } else {
      await Comment.findByIdAndDelete(commentId);
    }

    res.status(200).json({ message: "Commentaire supprimé avec succès" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};
