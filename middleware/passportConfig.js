const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/user");
const APP_ID = "2444971159020857";
const APP_SECRET = "64c81964aad1839fe76bbc9054e68842";
const REDIRECT_URI = "http://localhost:3300/api/user/auth/facebook/callback";
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
passport.use(
  new FacebookStrategy(
    {
      clientID: APP_ID,
      clientSecret: APP_SECRET,
      callbackURL: REDIRECT_URI,
      profileFields: ["id", "displayName", "emails"],
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        let user = await User.findOne({ facebookId: profile.id });
        if (!user) {
          user = await User.create({
            // email: profile.emails[0].value,
            email: "",
            role: "client",
            displayName: profile.displayName,
            facebookId: profile.id,
          });
        }
        const maxAge = 365 * 24 * 60 * 60;
        const token = jwt.sign({ user }, jwtSecret, {
          expiresIn: maxAge, // 3hrs in sec
        });

        user.token = token;
        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
module.exports = passport;
