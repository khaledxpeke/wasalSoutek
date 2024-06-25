const router = require("express").Router();
const {
addReview,
getBadReviews,
getGoodReviews,
getNonApprovedReviews,
getReviewById,
deleteReview,
approveReview
} = require("../controllers/reviewController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/", roleAuth(["admin","client"]),addReview);
router.get("/bad", roleAuth(["admin","client"]), getBadReviews);
router.get("/good/:page", roleAuth(["admin","client"]), getGoodReviews);
router.get("/list", roleAuth(["admin"]), getNonApprovedReviews);
router.get("/:reviewId", roleAuth(["admin","client"]), getReviewById);
router.put("/approve/:reviewId", roleAuth(["admin"]), approveReview);
router.delete("/:reviewId", roleAuth(["admin","client"]), deleteReview);



module.exports = router;