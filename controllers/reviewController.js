const Review = require("../models/review");
const express = require("express");
const app = express();
require("dotenv").config();
app.use(express.json());
const multer = require("multer");
const multerStorage = require("../middleware/multerStorage");
const fs = require("fs");
const Comment = require("../models/comment");
const upload = multer({ storage: multerStorage }).array("images");
const path = require("path");

exports.addReview = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.files) {
      return res.status(400).json({
        message: "Ajouter une image",
        error: "Please upload an image",
      });
    }
    const { name, link, review, message } = req.body;
    const images = req.files.map((file) => file.filename);
    const userRole = req.user.user.role;
    let approved = false;

    if (userRole == "client") {
      approved = false;
    } else {
      approved = true;
    }

    try {
      const reviews = await Review.create({
        name,
        link: link || "",
        review,
        message,
        approved,
        images: images,
        user: req.user.user._id,
      });
      res.status(201).json({ reviews, message: "Review added successfully" });
    } catch (error) {
      res
        .status(400)
        .json({ message: "An error occurred", error: error.message });
    }
  });
};

exports.getNonApprovedReviews = async (req, res) => {
  try {
    const { page } = req.params;
    const limit = 3;
    const reviews = await Review.find({ approved: false })
      .populate("user", "displayName image")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.approveReview = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    review.approved = true;
    await review.save();
    res.status(200).json({ message: "Review approved successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getBadReviews = async (req, res) => {
  try {
    const { page } = req.params;
    const limit = 3;
    const reviews = await Review.find({ approved: true, review: false })
      .populate("user", "displayName image")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getGoodReviews = async (req, res) => {
  try {
    const { page } = req.params;
    const limit = 3;
    const reviews = await Review.find({ approved: true, review: true })
      .populate("user", "displayName image")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getReviewById = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId).populate(
      "user",
      "displayName image"
    );
    res.status(200).json(review);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getFiltredReviews = async (req, res) => {
  const { page, filter, search } = req.params;
  try {
    const limit = 10;
    let query = {};

    // Construct the query based on the filter
    if (filter === "positive") {
      query = { approved: true, review: true };
    } else if (filter === "negative") {
      query = { approved: true, review: false };
    } else if (filter === "pending") {
      query = { approved: false };
    }

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { 'user.displayName': { $regex: new RegExp(search, "i") } }
      ];
    }
    let reviews = await Review.find(query)
      .populate("user", "displayName image")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // if (search) {
    //   const userRegex = new RegExp(search, "i");
    //   reviews = reviews.filter(review => review.user && userRegex.test(review.user.displayName));
    // }

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  const userRole = req.user.user.role;
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.images) {
      review.images.forEach((image) => {
        const imagePath = path.join(__dirname, "..", "uploads", image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }
    if (userRole == "client") {
      if (review.user.toString() !== req.user.user._id) {
        return res.status(401).json({ message: "you dont own the post" });
      }
    }
    await Review.findByIdAndDelete(reviewId);
    const comments = await Comment.deleteMany({ review: reviewId });
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
