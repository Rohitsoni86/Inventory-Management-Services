const express = require("express");
const { createNewUser, loginAdmin } = require("../controllers/userController");
const {
	loginUser,
	verifyUserMFA,
	refreshUserToken,
	verifyUserAuth,
} = require("../controllers/orgAuthController");
const {
	verifyUserTemporaryToken,
	verifyOrganizationJWT,
} = require("../middlewares/verifyJWT");

const userRouter = express.Router();

userRouter.route("/organization/add").post(loginUser);

// authentication

userRouter.route("/organization/login").post(loginUser);
userRouter.post(
	"/organization/verifyMFA",
	verifyUserTemporaryToken,
	verifyUserMFA
);

userRouter.use(verifyOrganizationJWT);
userRouter.post("/organization/verify", verifyUserAuth);

module.exports = userRouter;
