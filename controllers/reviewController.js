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
    const limit = 10;

    // Calculate skip based on page number
    const skip = (page - 1) * limit;

    // Fetch non-approved reviews with pagination
    const reviews = await Review.find({ approved: false })
      .populate("user", "displayName image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
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
    let matchQuery = {};

    // Construct the query based on the filter
    if (filter === "positive") {
      matchQuery = { approved: true, review: true };
    } else if (filter === "negative") {
      matchQuery = { approved: true, review: false };
    } else if (filter === "pending") {
      matchQuery = { approved: false };
    }

    const aggregationPipeline = [];

    aggregationPipeline.push({ $match: matchQuery });

    aggregationPipeline.push({
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    });

    aggregationPipeline.push({ $unwind: "$user" });

    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { "user.displayName": { $regex: new RegExp(search, "i") } },
            { name: { $regex: new RegExp(search, "i") } },
          ],
        },
      });
    }

    aggregationPipeline.push({
      $project: {
        _id: 1,
        name: 1,
        link: 1,
        images: 1,
        review: 1,
        message: 1,
        approved: 1,
        createdAt: 1,
        user: { displayName: "$user.displayName", image: "$user.image" },
      },
    });

    aggregationPipeline.push({ $sort: { createdAt: -1 } });
    aggregationPipeline.push({ $skip: (page - 1) * limit });
    aggregationPipeline.push({ $limit: limit });

    const reviews = await Review.aggregate(aggregationPipeline);

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
exports.getSuggestions = async (req, res) => {
  const { filter, search } = req.params;
  console.log(search)
  try {
    const limit = 10;
    let matchQuery = {};

    // Construct the query based on the filter
    if (filter === "positive") {
      matchQuery = { approved: true, review: true };
    } else if (filter === "negative") {
      matchQuery = { approved: true, review: false };
    } else if (filter === "pending") {
      matchQuery = { approved: false };
    }
    const searchRegex = new RegExp(search, "i");
    const aggregationPipeline = [];

    aggregationPipeline.push({ $match: matchQuery });

    aggregationPipeline.push({
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    });

    aggregationPipeline.push({ $unwind: "$user" });

    aggregationPipeline.push({
      $facet: {
        reviews: [
          {
            $match: { name: { $regex: searchRegex } },
          },
          {
            $project: { name: 1, _id: 0 },
          },
          {
            $group: {
              _id: "$name",
            },
          },
          { $sort: { _id: 1 } },
          { $limit: limit },
        ],
        users: [
          {
            $match: { "user.displayName": { $regex: searchRegex } },
          },
          {
            $project: { name: "$user.displayName", _id: 0 },
          },
          {
            $group: {
              _id: "$name",
            },
          },
          { $sort: { _id: 1 } },
          { $limit: limit },
        ],
      },
    });

    const results = await Review.aggregate(aggregationPipeline);
    
    const suggestions = [...results[0].reviews, ...results[0].users];

    res.status(200).json(suggestions.map(s => s._id));
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
exports.rateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { stars } = req.body;
    const userId = req.user.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const existingRating = review.ratings.find(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingRating) {
      existingRating.stars = stars;
    } else {
      review.ratings.push({ user: userId, stars });
    }

    const totalStars = review.ratings.reduce(
      (acc, rate) => acc + rate.stars,
      0
    );
    review.stars = totalStars / review.ratings.length;

    await review.save();

    res.status(200).json(review);
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
