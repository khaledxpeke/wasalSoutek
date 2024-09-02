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
getAllPendingReviews,
rateReview,
getGroupedReviews,
editReview,
updateGroupedReviewName
} = require("../controllers/reviewController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/", roleAuth(["admin", "client"]), addReview);
router.post("/rate/:reviewId", roleAuth(["admin", "client"]), rateReview);
router.delete("/:reviewId", roleAuth(["admin", "client"]), deleteReview);
router.put("/:reviewId", roleAuth(["admin"]),editReview );
router.put("/update/:reviewId", roleAuth(["admin"]),updateGroupedReviewName );
router.put("/approve/:reviewId", roleAuth(["admin"]), approveReview);


// Get operations (specific routes first)
router.get("/", roleAuth(["admin"]), getAllPendingReviews);
router.get("/:reviewId", roleAuth(["admin", "client"]), getReviewById);
// router.get("/bad/:page", roleAuth(["admin", "client"]), getBadReviews);
// router.get("/good/:page", roleAuth(["admin", "client"]), getGoodReviews);
// router.get("/list/:page", roleAuth(["admin"]), getNonApprovedReviews);
router.get("/grouped/:name", roleAuth(["admin", "client"]), getGroupedReviews);
router.get("/pending/:page/:search?", roleAuth(["admin", "client"]), getFiltredPendingReviews);
router.get("/suggest/:filter/:search?", roleAuth(["admin", "client"]), getSuggestions);
router.get("/:filter/:page/:search?", roleAuth(["admin", "client"]), getFiltredReviews);






module.exports = router;