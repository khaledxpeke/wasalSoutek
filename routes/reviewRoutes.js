const router = require("express").Router();
const {
addReview,
getBadReviews,
getGoodReviews,
getNonApprovedReviews,
getReviewById,
deleteReview,
approveReview,
getFiltredReviews
} = require("../controllers/reviewController");
const  {roleAuth}  = require("../middleware/auth");

router.post("/", roleAuth(["admin","client"]),addReview);
router.get("/bad/:page", roleAuth(["admin","client"]), getBadReviews);
router.get("/good/:page", roleAuth(["admin","client"]), getGoodReviews);
router.get("/:filter/:page/:search?", roleAuth(["admin","client"]), getFiltredReviews);
router.get("/list/:page", roleAuth(["admin"]), getNonApprovedReviews);
router.get("/:reviewId", roleAuth(["admin","client"]), getReviewById);
router.put("/approve/:reviewId", roleAuth(["admin"]), approveReview);
router.delete("/:reviewId", roleAuth(["admin","client"]), deleteReview);



module.exports = router;