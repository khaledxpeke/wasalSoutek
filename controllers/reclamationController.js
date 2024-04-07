const Reclamation = require("../models/reclamation");
const express = require("express");
const app = express();
require("dotenv").config();
app.use(express.json());
const multer = require("multer");
const multerStorage = require("../middleware/multerStorage");
const fs = require("fs");
const upload = multer({ storage: multerStorage });

exports.addReclamation = async (req, res, next) => {
  upload.multiple("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: "Error uploading image" });
    }
    const { phone, message, time } = req.body;
    const images = req.files.map((file) => file.filename);
    try {
      const reclamation = await Reclamation.create({
        phone,
        images: images,
        messages: [{ message, user: req.user._id, time }],
        user: req.user._id,
      });
      res
        .status(201)
        .json({ reclamation, message: "Reclamation added successfully" });
    } catch (error) {
      res
        .status(400)
        .json({ message: "An error occurred", error: error.message });
    }
  });
};

exports.getReclamations = async (req, res) => {
  try {
    const reclamations = await Reclamation.find({ user: req.user._id });
    res.status(200).json({ reclamations });
  } catch (error) {
    res
      .status(400)
      .json({ message: "An error occurred", error: error.message });
  }
};
