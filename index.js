const express = require("express");
const app = express();
const connectDB = require("./db/db");
const cors = require("cors");
const { roleAuth } = require("./middleware/auth");
const session = require('express-session');
const passport = require("./middleware/passportConfig");
const crypto = require('crypto');
const secretKey = crypto.randomBytes(64).toString('hex');
app.timeout = 300000;
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: secretKey, 
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

connectDB();
server = app.listen(3300, function () {
  console.log("Server is listening on port 3300");
});

app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/reclamation", require("./routes/reclamationRoutes"));
app.use("/api/uploads", express.static("uploads"));

app.get("/adminRoute", roleAuth("admin"), (req, res) => {
  res.send("Authenticated Route for Admin");
});
app.get("/chefRoute", roleAuth(["chef"]), (req, res) => {
  res.send("Authenticated Route for Chef chantier");
});
