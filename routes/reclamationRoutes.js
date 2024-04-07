const router = require("express").Router();
const passport = require("passport");
const {
addReclamation,
getReclamations
} = require("../controllers/reclamationController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/", roleAuth(["admin","client"]),addReclamation);
router.get("/", roleAuth(["admin","client"]), getReclamations);



module.exports = router;