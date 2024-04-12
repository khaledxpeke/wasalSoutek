const router = require("express").Router();
const {
addComment,
getComments
} = require("../controllers/commentController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/:reviewId", roleAuth(["admin","client"]),addComment);
router.get("/:reviewId", roleAuth(["admin","client"]), getComments);



module.exports = router;