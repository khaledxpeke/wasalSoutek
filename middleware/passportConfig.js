const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require("../models/user");
const APP_ID = '2444971159020857';
const APP_SECRET = '64c81964aad1839fe76bbc9054e68842';
const REDIRECT_URI = 'http://localhost:3000/auth/facebook/callback';
passport.use(new FacebookStrategy({
  clientID: APP_ID,
  clientSecret: APP_SECRET,
  callbackURL: REDIRECT_URI,
  profileFields: ['id', 'displayName', 'email']
},
async function(accessToken, refreshToken, profile, done) {
  try {
    // Check if the user already exists in the database
    let user = await User.findOne({ facebookId: profile.id });

    // If the user doesn't exist, create a new user
    if (!user) {
      user = await User.create({
        email: profile.emails[0].value,
        role: 'client', // Set the default role for Facebook users
        firstName: profile.displayName,
        facebookId: profile.id
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}
));

module.exports = passport;