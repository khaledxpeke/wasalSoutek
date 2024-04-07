const router = require("express").Router();
const passport = require("passport");
const {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getClients
} = require("../controllers/userController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/",  getUsers);
router.get("/client", roleAuth(["admin"]), getClients);
router.get("/:userId", roleAuth(["admin","client"]), getUserById);
router.put("/:userId", roleAuth(["admin","client"]), updateUser);
router.delete("/:userId", roleAuth(["admin"]), deleteUser);
router.get('/auth/facebook', passport.authenticate('facebook'));
router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // res.redirect('/');
    res.json({ message: 'Authentication successful' });
  }
);



module.exports = router;