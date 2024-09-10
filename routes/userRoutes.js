const router = require("express").Router();
const passport = require("passport");
const {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getClients,
  logout
} = require("../controllers/userController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/", roleAuth(["admin"]), getUsers);
router.get("/client", roleAuth(["admin"]), getClients);
router.get("/:userId", roleAuth(["admin","client"]), getUserById);
router.put("/", roleAuth(["admin","client"]), updateUser);
router.put("/token", roleAuth(["admin","client"]), logout);
router.delete("/:userId", roleAuth(["admin"]), deleteUser);
router.get('/auth/facebook', passport.authenticate('facebook'));
router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    const token = req.user.token;
    // res.redirect('/auth/facebook/success');
    res.json({ token });
  }
);



module.exports = router;