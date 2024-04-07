const jwt = require("jsonwebtoken");
require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;

exports.roleAuth = (expectedRoles) => {
    return (req, res, next) => {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token == null) return res.status(401).json({ message: "Not authorized" });
      jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.status(403).json({ message: "Not authorized" });
        
        if (!expectedRoles.includes(user.user.role)) {
          return res.status(403).json({ message: "Not authorized" });
        }
        req.user = user;
        next();
      });
    };
  };