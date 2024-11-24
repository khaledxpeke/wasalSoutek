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
const mongoose = require("mongoose");
const User = require("../models/user");
var admin = require("firebase-admin");
var serviceAccount = require("../config/push-notification-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.addReview = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.files) {
      return res.status(400).json({
        message: "Ajouter une image",
        error: "Veuillez télécharger une image",
      });
    }
    const { name, link, review, message, stars, anonyme } = req.body;
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
        stars,
        images: images,
        anonyme,
        user: req.user.user._id,
      });
      await sendNotification(req.user.user._id, reviews.name);
      res.status(201).json({ reviews, message: "Avis ajouté avec succès" });
    } catch (error) {
      if (error.code === 11000) {
        res.status(400).json({ message: "Le nom de l'avis doit être unique." });
      } else {
        res
          .status(400)
          .json({ message: "Une erreur s'est produite", error: error.message });
      }
    }
  });
};

const sendNotification = async (userId, review) => {
  try {
    const admins = await User.find({
      role: "admin",
      fcmToken: { $ne: "" },
    });
    const tokens = admins.map((admin) => admin.fcmToken);
    await sendNotificationToAdmin(userId, tokens, review);
  } catch (error) {
    console.error("Error in sendNotification:", error.message);
  }
};

const sendNotificationToAdmin = async (userId, tokens, review) => {
  try {
    const client = await User.findOne({ _id: userId });

    for (const token of tokens) {
      try {
        const payload = {
          notification: {
            title: "Avis",
            body: `Le Client ${client.displayName} a posté un avis ${review}`,
          },
          token: token, // Ensure this is the correct token for the FCM message
        };

        await admin
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Message envoyé avec succès :", response);
          })
          .catch((error) => {
            console.log("Erreur lors de l'envoi du message : ", error);
          });
      } catch (error) {
        console.error("Erreur lors de l'envoi de la notification :", error);
      }
    }
  } catch (error) {
    console.error("Erreur lors sendNotificationToChef:", error.message);
  }
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
//       .json({ message: "Une erreur s'est produite", error: error.message });
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
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.approveReview = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Avis non trouvé" });
    }
    review.approved = true;
    review.createdAt = Date.now();
    await review.save();
    const user = await User.findById(review.user);

    if (user && user.fcmToken) {
      const message = {
        notification: {
          title: "Avis accepté",
          body: "Votre avis a été acceptées!",
        },
        token: user.fcmToken,
      };

      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Message envoyé avec succès :", response);
        })
        .catch((error) => {
          console.error("Erreur lors de lenvoi du message :", error);
        });
    }
    res.status(200).json({ message: "Avis acceptée avec succées" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
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
//       .json({ message: "Une erreur s'est produite", error: error.message });
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
//       .json({ message: "Une erreur s'est produite", error: error.message });
//   }
// };

exports.getReviewById = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.user._id;
  const userRole = req.user.user.role;
  try {
    const review = await Review.findById(reviewId)
      .populate("user", "displayName image anonyme")
      .lean();
    if (!review) {
      return res.status(404).json({ message: "Aucun Avis trouvée" });
    }
    // const ratings = review.ratings || [];
    // const userHasRated = ratings.some(
    //   (rating) => rating.user.toString() === userId.toString()
    // );
    let displayName = review.user.displayName;
    let image = review.user.image;

    if (
      review.anonyme &&
      userId.toString() !== review.user._id.toString() &&
      userRole !== "admin"
    ) {
      displayName = "Anonyme";
      image = "uploads\\anonyme.png";
    }

    const response = {
      data: {
        ...review,
        user: {
          _id: review.user._id,
          displayName,
          image: image,
        },
      },
      userStars: review.stars,
    };
    // const { ratings: _, ...reviewWithoutRatings } = review;

    // const ratePercentage = ratings.length || 0;
    res.status(200).json(response);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.getFiltredReviews = async (req, res) => {
  const { page, filter, search } = req.params;
  try {
    const limit = 20;
    let matchQuery = {};
    const userId = req.user.user._id;
    const userRole = req.user.user.role;

    if (filter === "positive") {
      matchQuery = { approved: true, review: true };
    } else if (filter === "negative") {
      matchQuery = { approved: true, review: false };
    } else if (filter === "all") {
      matchQuery = { approved: true };
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
        // userDisplayName: {
        //   $cond: {
        //     if: {
        //       $and: [
        //         { $eq: ["$anonyme", true] },
        //         {
        //           $ne: [{ $toString: "$user._id" }, { $toString: userId }],
        //         },
        //         { $ne: [userRole, "admin"] },
        //       ],
        //     },
        //     then: "Anonyme",
        //     else: "$user.displayName",
        //   },
        // },
      },
    });
    aggregationPipeline.push({
      $group: {
        _id: "$normalizedName",
        stars: { $avg: { $ifNull: ["$stars", 0] } },
        // ratingPercentage: { $sum: { $size: { $ifNull: ["$ratings", []] } } },
        createdAt: { $min: "$createdAt" },
        user: { $first: "$user.displayName" },
        userId: { $first: "$user._id" },
        count: { $sum: 1 },
        originalName: { $first: "$name" },
        originalId: { $first: "$_id" },
        anonyme: { $first: "$anonyme" },
        message: { $first: "$message" },
        review: { $first: "$review"},
      },
    });

    aggregationPipeline.push({
      $addFields: {
        stars: { $round: ["$stars", 3] },
        starsPercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ["$totalStars", { $multiply: [5, "$count"] }] },
                100
              ]
            },
            2
          ]
        },
        grouped: {
          $cond: { if: { $gt: ["$count", 1] }, then: true, else: false },
        },
        ratingPercentage: {
          $cond: {
            if: { $gt: ["$count", 1] },
            then: "$count",
            else: "$$REMOVE",
          },
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
        createdAt: -1,
        // stars: -1,
      },
    });
    aggregationPipeline.push({ $skip: (page - 1) * limit });
    aggregationPipeline.push({ $limit: limit });

    aggregationPipeline.push({
      $project: {
        _id: "$originalId",
        name: "$originalName",
        stars: 1,
        starsPercentage: {
          $cond: {
            if: { $eq: ["$grouped", true] },
            then: "$starsPercentage", 
            else: "$$REMOVE", 
          },
        },
        ratingPercentage: {
          $cond: {
            if: { $eq: ["$grouped", true] },
            then: "$ratingPercentage",
            else: "$$REMOVE",
          },
        },
        isNew: 1,
        grouped: 1,
        user: 1,
        userId: 1,
        anonyme: 1,
        message: 1,
        review: 1,
      },
    });
    const reviews = await Review.aggregate(aggregationPipeline);

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.getGroupedReviews = async (req, res) => {
  const { name } = req.params;
  const userId = req.user.user._id;
  const userRole = req.user.user.role;
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
        approved: true,
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
        message: 1,
        ratingPercentage: { $size: { $ifNull: ["$ratings", []] } },
        user: {
          $cond: {
            if: {
              $and: [
                { $eq: ["$anonyme", true] }, 
                { $ne: [{ $toString: "$user._id" }, { $toString: userId }] }, 
                { $ne: [userRole, "admin"] }, 
              ],
            },
            then: "Anonyme", 
            else: "$user.displayName", 
          },
        },
      },
    });

    const groupedReviews = await Review.aggregate(aggregationPipeline);

    res.status(200).json(groupedReviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.getFiltredPendingReviews = async (req, res) => {
  const { page, search } = req.params;
  try {
    const limit = 10;
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
        anonyme: 1,
        // rating: 1,
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
      .json({ message: "Une erreur s'est produite", error: error.message });
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
    } else if (filter === "all") {
      matchQuery = { approved: true };
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
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};

exports.getProfilReviews = async (req, res) => {
  const userId = req.user.user._id;
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let matchQuery = { approved: true, user: userObjectId };

    const aggregationPipeline = [
      { $match: matchQuery },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },

      { $unwind: "$user" },

      {
        $addFields: {
          stars: { $round: ["$stars", 3] },
          isNew: {
            $gte: ["$createdAt", new Date(Date.now() - 24 * 60 * 60 * 1000)],
          },
        },
      },

      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          stars: { $avg: { $ifNull: ["$stars", 0] } },
          createdAt: { $min: "$createdAt" },
          user: { $first: "$user.displayName" },
          userId: { $first: "$user._id" },
          count: { $sum: 1 },
          message: { $first: "$message" },
        },
      },

      {
        $addFields: {
          ratingPercentage: {
            $cond: {
              if: { $gt: ["$count", 1] },
              then: "$count",
              else: "$$REMOVE",
            },
          },
          isNew: {
            $gte: ["$createdAt", new Date(Date.now() - 24 * 60 * 60 * 1000)],
          },
        },
      },

      {
        $project: {
          _id: "$_id",
          name: 1,
          stars: 1,
          ratingPercentage: 1,
          isNew: 1,
          user: 1,
          userId: 1,
          message: 1,
        },
      },

      {
        $sort: {
          isNew: -1,
          ratingPercentage: -1,
          stars: -1,
          createdAt: -1,
        },
      },
    ];

    const reviews = await Review.aggregate(aggregationPipeline);

    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};
exports.rateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { stars } = req.body;
    const userId = req.user.user._id;

    if (stars < 1 || stars > 5) {
      return res
        .status(400)
        .json({ message: "La note doit être comprise entre 1 et 5." });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Avis non trouvé" });
    }
    const isOwner = review.user.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à modifier cette évaluation.",
      });
    }

    review.stars = stars;
    await review.save();

    const groupReviews = await Review.find({
      name: new RegExp(`^${review.name}$`, "i"),
    });

    const totalStars = groupReviews.reduce((acc, rev) => acc + rev.stars, 0);
    const totalRatings = groupReviews.length;

    const averageStars = totalRatings > 0 ? totalStars / totalRatings : 0;
    const starsPercentage =
    totalRatings > 1 ? parseFloat(((averageStars - 1) * 20).toFixed(3)) : null;

    await review.save();

    const roundedAverageStars = parseFloat(averageStars.toFixed(3));
    const roundedReviewStars = parseFloat(review.stars.toFixed(3));

    res.status(200).json({
      message: "Évaluation mise à jour avec succès",
      stars: roundedReviewStars,
      starsPercentage,
      ratingPercentage: groupReviews.length,
      groupedStars: roundedAverageStars,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};
exports.deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  const userRole = req.user.user.role;
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Avis non trouvé" });
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
        return res
          .status(401)
          .json({ message: "tu n'es pas propriétaire du post" });
      }
    }
    await Review.findByIdAndDelete(reviewId);
    const comments = await Comment.deleteMany({ review: reviewId });
    res.status(200).json({ message: "Avis supprimé avec succès" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
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
        console.error("Échec de l'analyse de removeImages :", parseError);
        return res
          .status(400)
          .json({ message: "Format non valide pour removeImages." });
      }
    }

    try {
      const review = await Review.findById(reviewId).populate("user");

      if (!review) {
        return res.status(404).json({ message: "Aucun avis trouvé." });
      }
      const isAdmin = req.user.user._role === "admin";
      const isOwner = review.user._id.equals(req.user.user._id);
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          message: "Vous n'avez pas l'autorisation de modifier cet avis.",
        });
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
                console.error(
                  "Échec de la suppression du fichier image :",
                  unlinkError
                );
              }
            } else {
              console.warn(`Fichier image non trouvé: ${imagePath}`);
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
        .json({ message: "Une erreur s'est produite", error: error.message });
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
      return res.status(404).json({ message: "Aucun avis trouvé." });
    }

    await Review.updateMany(
      { name: { $regex: new RegExp(`^${normalizedCurrentName}$`, "i") } },
      { $set: { name: normalizedNewName } }
    );

    res.status(200).json({ message: "Avis groupée modifiée avec succées." });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Une erreur s'est produite", error: error.message });
  }
};
