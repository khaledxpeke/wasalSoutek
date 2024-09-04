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
      if (error.code === 11000) {
        res.status(400).json({ message: "Review name must be unique." });
      } else {
        res
          .status(400)
          .json({ message: "An error occurred", error: error.message });
      }
    }
  });
};

// exports.getNonApprovedReviews = async (req, res) => {
//   try {
//     const { page } = req.params;
//     const limit = 3;

//     const skip = (page - 1) * limit;

//     const reviews = await Review.find({ approved: false })
//       .populate("user", "displayName image")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .exec();
//     res.status(200).json(reviews);
//   } catch (error) {
//     res
//       .status(400)
//       .json({ message: "An error occurred", error: error.message });
//   }
// };

exports.getAllPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ approved: false });
    const length = reviews.length;

    res.status(200).json({ size: length });
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
    review.createdAt = Date.now();
    await review.save();
    res.status(200).json({ message: "Review approved successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

// exports.getBadReviews = async (req, res) => {
//   try {
//     const { page } = req.params;
//     const limit = 10;
//     const reviews = await Review.find({ approved: true, review: false })
//       .populate("user", "displayName image")
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     res.status(200).json(reviews);
//   } catch (error) {
//     res
//       .status(400)
//       .json({ message: "An error occurred", error: error.message });
//   }
// };

// exports.getGoodReviews = async (req, res) => {
//   try {
//     const { page } = req.params;
//     const limit = 10;
//     const reviews = await Review.find({ approved: true, review: true })
//       .populate("user", "displayName image")
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     res.status(200).json(reviews);
//   } catch (error) {
//     res
//       .status(400)
//       .json({ message: "An error occurred", error: error.message });
//   }
// };

exports.getReviewById = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.user._id;
  try {
    const review = await Review.findById(reviewId)
      .populate("user", "displayName image")
      .lean();
    if (!review) {
      return res.status(404).json({ message: "Aucun Review trouvée" });
    }
    const ratings = review.ratings || [];
    const userHasRated = ratings.some(
      (rating) => rating.user.toString() === userId.toString()
    );
    const userStars = userHasRated
      ? ratings.find((rating) => rating.user.toString() === userId.toString())
          .stars
      : 0;
    const { ratings: _, ...reviewWithoutRatings } = review;

    const ratePercentage = ratings.length || 0;
    res.status(200).json({
      data: reviewWithoutRatings,
      ratePercentage,
      userHasRated,
      userStars,
    });
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

    if (filter === "positive") {
      matchQuery = { approved: true, review: true };
    } else if (filter === "negative") {
      matchQuery = { approved: true, review: false };
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

    if (search && search.trim() !== "") {
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
      $addFields: {
        normalizedName: { $toLower: "$name" },
      },
    });
    aggregationPipeline.push({
      $group: {
        _id: "$normalizedName",
        stars: { $avg: { $ifNull: ["$stars", 0] } },
        ratingPercentage: { $sum: { $size: { $ifNull: ["$ratings", []] } } },
        createdAt: { $min: "$createdAt" },
        user: { $first: "$user.displayName" },
        count: { $sum: 1 },
        originalName: { $first: "$name" },
        originalId: { $first: "$_id" },
      },
    });

    aggregationPipeline.push({
      $addFields: {
        stars: { $round: ["$stars", 3] },
        grouped: {
          $cond: { if: { $gt: ["$count", 1] }, then: true, else: false },
        },
        isNew: {
          $gte: ["$createdAt", new Date(Date.now() - 24 * 60 * 60 * 1000)],
        },
      },
    });

    aggregationPipeline.push({
      $sort: {
        isNew: -1,
        grouped: -1,
        ratingPercentage: -1,
        stars: -1,
        createdAt: -1,
      },
    });
    aggregationPipeline.push({ $skip: (page - 1) * limit });
    aggregationPipeline.push({ $limit: limit });

    aggregationPipeline.push({
      $project: {
        _id: "$originalId",
        name: "$originalName",
        stars: 1,
        ratingPercentage: 1,
        isNew: 1,
        grouped: 1,
        user: 1,
      },
    });
    const reviews = await Review.aggregate(aggregationPipeline);

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getGroupedReviews = async (req, res) => {
  const { name } = req.params;
  try {
    const aggregationPipeline = [];

    const normalizedQueryName = name.toLowerCase();
    aggregationPipeline.push({
      $addFields: {
        normalizedName: { $toLower: "$name" },
      },
    });

    aggregationPipeline.push({
      $match: {
        normalizedName: normalizedQueryName,
      },
    });
    aggregationPipeline.push({
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    });
    aggregationPipeline.push({
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    });
    aggregationPipeline.push({
      $project: {
        _id: 1,
        name: 1,
        stars: 1,
        ratingPercentage: { $size: { $ifNull: ["$ratings", []] } },
        user: "$user.displayName",
      },
    });

    const groupedReviews = await Review.aggregate(aggregationPipeline);

    res.status(200).json(groupedReviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getFiltredPendingReviews = async (req, res) => {
  const { page, search } = req.params;
  try {
    const limit = 3;
    let matchQuery = {};

    matchQuery = { approved: false };

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

    if (search && search.trim() !== "") {
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
        rating: 1,
        stars: 1,
        createdAt: 1,
        user: { displayName: "$user.displayName", image: "$user.image" },
      },
    });

    aggregationPipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
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
  try {
    const limit = 5;
    let matchQuery = {};

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
      $addFields: {
        normalizedName: { $toLower: "$name" },
      },
    });

    aggregationPipeline.push({
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    });

    aggregationPipeline.push({ $unwind: "$user" });
    if (search && search.trim() !== "") {
      aggregationPipeline.push({
        $facet: {
          reviews: [
            {
              $match: { normalizedName: { $regex: searchRegex } },
            },
            {
              $project: { name: 1, normalizedName: 1, _id: 0 },
            },
            {
              $group: {
                _id: "$normalizedName",
                name: { $first: "$name" },
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
              $project: {
                name: "$user.displayName",
                normalizedName: { $toLower: "$user.displayName" },
                _id: 0,
              },
            },
            {
              $group: {
                _id: "$normalizedName",
                name: { $first: "$name" },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: limit },
          ],
        },
      });
    }
    const results = await Review.aggregate(aggregationPipeline);

    const suggestions = [
      ...(results[0].reviews || []),
      ...(results[0].users || []),
    ];

    res.status(200).json(suggestions.map((s) => s.name));
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.getProfilReviews = async (req, res) => {
  const { search } = req.params;
  const userId = req.user.user._id;
  try {
    let query = { user: userId, approved: true };

    if (search) {
      query.name = new RegExp(search, "i");
    }

    const review = await Review.find(query);
    res.status(200).json(review);
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
      if (stars === 0) {
        review.ratings = review.ratings.filter(
          (r) => r.user.toString() !== userId.toString()
        );
      } else {
        existingRating.stars = stars;
      }
    } else {
      if (stars !== 0) {
        review.ratings.push({ user: userId, stars });
      }
    }

    const totalStars = review.ratings.reduce(
      (acc, rate) => acc + rate.stars,
      0
    );
    review.stars =
      review.ratings.length > 0 ? totalStars / review.ratings.length : 0;

    await review.save();

    const groupReviews = await Review.find({
      name: new RegExp(`^${review.name}$`, "i"),
    });
    if (groupReviews.length > 1) {
      const groupTotalStars = groupReviews.reduce(
        (acc, rev) => acc + rev.stars,
        0
      );

      const groupTotalRatings = groupReviews.reduce(
        (acc, rev) => acc + rev.ratings.length,
        0
      );

      const groupAverageStars = groupTotalStars / groupReviews.length;

      const roundedGroupAverageStars = parseFloat(groupAverageStars.toFixed(3));
      const roundedReviewStars = parseFloat(review.stars.toFixed(3));
      res.status(200).json({
        message: "Rating updated successfully",
        groupedstars: roundedGroupAverageStars,
        groupedratingPercentage: groupTotalRatings,
        stars: roundedReviewStars,
        ratingPercentage: review.ratings.length,
      });
    } else {
      const roundedReviewStars = parseFloat(review.stars.toFixed(3));
      res.status(200).json({
        message: "Rating updated successfully",
        stars: roundedReviewStars,
        ratingPercentage: review.ratings.length,
      });
    }
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

exports.editReview = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    const { reviewId } = req.params;
    let { removeImages = "[]", ...updates } = req.body;
    if (typeof removeImages === "string") {
      try {
        removeImages = JSON.parse(removeImages);
      } catch (parseError) {
        console.error("Failed to parse removeImages:", parseError);
        return res
          .status(400)
          .json({ message: "Invalid format for removeImages." });
      }
    }

    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({ message: "No review found." });
      }
      const imageDir = path.join(__dirname, "..", "uploads");
      if (Array.isArray(removeImages) && removeImages.length > 0) {
        removeImages.forEach((imageName) => {
          const imagePath = path.join(imageDir, imageName);
          if (review.images.includes(imageName)) {
            if (fs.existsSync(imagePath)) {
              try {
                fs.unlinkSync(imagePath);
              } catch (unlinkError) {
                console.error("Failed to remove image file:", unlinkError);
              }
            } else {
              console.warn(`Image file not found: ${imagePath}`);
            }
            review.images = review.images.filter((img) => img !== imageName);
          }
        });
      }

      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          review.images.push(file.filename);
        });
      }

      Object.assign(review, updates);

      const updatedReview = await review.save();

      res.status(200).json(updatedReview);
    } catch (error) {
      res
        .status(400)
        .json({ message: "An error occurred", error: error.message });
    }
  });
};

exports.updateGroupedReviewName = async (req, res) => {
  try {
    const { currentName } = req.params;
    const { name } = req.body;

    const normalizedCurrentName = currentName.trim().toLowerCase();
    const normalizedNewName = name.trim().toLowerCase();
    const reviews = await Review.find({
      name: new RegExp(`^${normalizedCurrentName}$`, "i"),
    });
    if (reviews.length === 0) {
      return res.status(404).json({ message: "Aucun review trouvée." });
    }

    await Review.updateMany(
      { name: { $regex: new RegExp(`^${normalizedCurrentName}$`, "i") } },
      { $set: { name: normalizedNewName } }
    );

    res.status(200).json({ message: "reviews groupée modifiée avec succées." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
