const router = require("express").Router();
const {
addReview,
getReviews,
getNonApprovedReviews,
getReviewById,
deleteReview,
approveReview
} = require("../controllers/reviewController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/", roleAuth(["admin","client"]),addReview);
router.get("/", roleAuth(["admin","client"]), getReviews);
router.get("/:reviewId", roleAuth(["admin","client"]), getReviewById);
router.get("/list", roleAuth(["admin"]), getNonApprovedReviews);
router.put("/approve/:reviewId", roleAuth(["admin"]), approveReview);
router.delete("/:reviewId", roleAuth(["admin","client"]), deleteReview);



module.exports = router;