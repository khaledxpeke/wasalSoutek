const router = require("express").Router();
const {
addReview,
getBadReviews,
getGoodReviews,
getNonApprovedReviews,
getReviewById,
deleteReview,
approveReview,
getFiltredReviews,
getFiltredPendingReviews,
getSuggestions,
rateReview
} = require("../controllers/reviewController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/", roleAuth(["admin", "client"]), addReview);
router.post("/rate/:reviewId", roleAuth(["admin", "client"]), rateReview);
router.delete("/:reviewId", roleAuth(["admin", "client"]), deleteReview);
router.put("/approve/:reviewId", roleAuth(["admin"]), approveReview);

// Get operations (specific routes first)
router.get("/:reviewId", roleAuth(["admin", "client"]), getReviewById);
// router.get("/bad/:page", roleAuth(["admin", "client"]), getBadReviews);
// router.get("/good/:page", roleAuth(["admin", "client"]), getGoodReviews);
// router.get("/list/:page", roleAuth(["admin"]), getNonApprovedReviews);
router.get("/pending/:page/:search?", roleAuth(["admin", "client"]), getFiltredPendingReviews);
router.get("/suggest/:filter/:search?", roleAuth(["admin", "client"]), getSuggestions);
router.get("/:filter/:page/:search?", roleAuth(["admin", "client"]), getFiltredReviews);






module.exports = router;