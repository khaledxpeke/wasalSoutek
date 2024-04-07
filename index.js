const express = require("express");
const app = express();
const connectDB = require("./db/db");
const cors = require("cors");
const { roleAuth } = require("./middleware/auth");
const passport = require("./middleware/passportConfig");
app.timeout = 300000;
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
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
