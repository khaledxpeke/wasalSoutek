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
const transporter = require("../middleware/email");
const upload = multer({ storage: multerStorage });
const defaultImage = "uploads\\user.png";
const crypto = require("crypto");

exports.register = async (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: "Le téléchargement de l'image a échoué",
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
              message: "Ce nom existe déjà",
              error: error.message,
            })
          );
      });
    } catch (error) {
      res.status(400).json({
        message: "Une erreur s'est produite",
        error: error.message,
      });
    }
  });
};

exports.login = async (req, res) => {
  const { email, password, fcmToken } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({
        message: "Aucun utilisateur trouvée",
        error: "Aucun utilisateur trouvée",
      });
    } else {
      bcrypt.compare(password, user.password).then(async function (result) {
        if (result) {
          user.fcmToken = fcmToken;
          await user.save();
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
      message: "Une erreur s'est produite",
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
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      user.displayName = displayName;

      if (req.file) {
        if (user.image !== "uploads\\user.png") {
          fs.unlinkSync(user.image);
        }

        user.image = req.file.path;
      }

      await user.save();
      res.status(200).json({ user: user });
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

exports.logout = async (req, res) => {
  const userId = req.user.user._id;
  const user = await User.findById(userId);
  user.fcmToken = "";
  await user.save();
  res.status(200).json({ message: "mise à jour du token réussie" });
};

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email non trouvée" });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();

    const resetCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is ${resetCode}. This code will expire in 1 hour.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset code sent to email" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.verifyResetCode = async (req, res) => {
  const { email, resetCode } = req.body;
  try {
    const user = await User.findOne({ email, resetCode });
    if (!user || new Date(user.resetCodeExpires).getTime() < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    res
      .status(200)
      .json({ message: "Code verified, proceed to reset password" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  try {
    const user = await User.findOne({ email, resetCode });
    if (!user || new Date(user.resetCodeExpires).getTime() < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

exports.resendResetCode = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Code (Resend)",
      text: `Your new password reset code is ${resetCode}. This code will expire in 1 hour.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset code resent to email" });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
};