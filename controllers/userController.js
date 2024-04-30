const User = require("../models/user");
const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;
app.use(express.json());
const multer = require("multer");
const multerStorage = require("../middleware/multerStorage");
const fs = require("fs");
const upload = multer({ storage: multerStorage });
const defaultImage = "uploads\\user.png";

exports.register = async (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: "Image upload failed",
        error: err.message,
      });
    }
    const { email, displayName, password } = req.body;
    const image = req.file ? req.file.path : defaultImage;
    try {
      const user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: "L'utilisateur existe déjà" });
      }

      bcrypt.hash(password, 10).then(async (hash) => {
        await User.create({
          email,
          role: "client",
          displayName,
          password: hash,
          image,
        })
          .then((user) => {
            const maxAge = 8 * 60 * 60;
            const token = jwt.sign({ id: user._id, email }, jwtSecret, {
              expiresIn: maxAge, // 3hrs in sec
            });
            res.cookie("jwt", token, {
              httpOnly: true,
              maxAge: maxAge * 1000, // 3hrs in ms
            });
            res.status(201).json({
              user: user,
              token: token,
              message: "Votre compte a été créé avec succès",
            });
          })
          .catch((error) =>
            res.status(400).json({
              message: "This name already exists",
              error: error.message,
            })
          );
      });
    } catch (error) {
      res.status(400).json({
        message: "An error occurred",
        error: error.message,
      });
    }
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({
        message: "Aucun utilisateur trouvée",
        error: "Aucun utilisateur trouvée",
      });
    } else {
      bcrypt.compare(password, user.password).then(function (result) {
        if (result) {
          const maxAgeInSeconds = 8 * 60 * 60 * 24 * 365; // 1 year in sec
          const maxAgeInMilliseconds = maxAgeInSeconds * 1000;
          const tokenPayload = {
            user: user,
          };
          const token = jwt.sign(tokenPayload, jwtSecret, {
            expiresIn: maxAgeInSeconds, // 3hrs in sec
          });
          res.cookie("jwt", token, {
            httpOnly: true,
            maxAge: maxAgeInMilliseconds * 1000, // 3hrs in ms
          });
          res.status(201).json({
            token: token,
          });
        } else {
          res
            .status(400)
            .json({ message: "les informations d'identification invalides!" });
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    if (!users) {
      return res.status(404).json({ message: "Aucun utilisateurs trouvée" });
    }
    res.status(200).json(users);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      message: "utilisateurs introuvables",
    });
  }
};

exports.getClients = async (req, res) => {
  try {
    const clients = await User.find({ role: "client" });
    if (!clients) {
      return res.status(404).json({ message: "Aucun client trouvé" });
    }
    res.status(200).json(clients);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      message: "client introuvable",
    });
  }
};

exports.getUserById = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      message: "Utilisateur non trouvé",
    });
  }
};

exports.updateUser = async (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Server Error");
    }

    const userId = req.user.user._id;
    const { displayName } = req.body;

    try {
      let user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.displayName = displayName;

      if (req.file) {
        if (user.image !== "uploads\\user.png") {
          fs.unlinkSync(user.image);
        }

        user.image = req.file.path;
      }

      await user.save();
      res.status(200).json({user:user});
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  });
};
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    let user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "Aucun client trouvée" });
    }
    res.status(200).json({ message: "Client supprimé avec succées" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
};
