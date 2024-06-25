const router = require("express").Router();
const {
addComment,
getComments,
deleteComment
} = require("../controllers/commentController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/:reviewId", roleAuth(["admin","client"]),addComment);
router.get("/:reviewId/:page", roleAuth(["admin","client"]), getComments);
router.delete("/:commentId", roleAuth(["admin","client"]), deleteComment);



module.exports = router;