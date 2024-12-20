const express = require("express");
const {
	registerOrganization,
	// getOneOrganization,
	// addOrganizationUser,
	// loginUser,
	// updateOrganizationStatus,
	// refresh,
	// produceMessageController,
	// getApiKey,
	// verifyUser,
} = require("../controllers/userControllers");
// const { authorizeUser } = require("../middleware/middleware");

const router = express.Router();

router.route("/organization/add").post(registerOrganization);
// router.route("/add").post(authorizeUser, addOrganizationUser);
// router
// 	.route("/organization/:id")
// 	.get(authorizeUser, getOneOrganization)
// 	.patch(authorizeUser, updateOrganizationStatus);
// router.route("/login").post(loginUser);
// router.route("/verify").get(authorizeUser, verifyUser);
// router.route("/refresh").get(refresh);
// router.route("/produce").post(produceMessageController);
// router.route("/product/key/:id").get(authorizeUser, getApiKey);
module.exports = router;
