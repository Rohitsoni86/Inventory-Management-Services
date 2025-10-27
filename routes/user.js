const express = require("express");
const {
	verifyTemporaryToken,
	verifyOrganizationJWT,
} = require("../middlewares/verifyJWT");
const {
	SignUp,
	LoginUser,
	VerifyUserMFA,
	VerifyUserAuth,
} = require("../controllers/authcontroller");

const userRouter = express.Router();

// authentication
userRouter.route("/organization/signup").post(SignUp);
userRouter.route("/organization/login").post(LoginUser);
userRouter.post(
	"/organization/user/verify-MFA",
	verifyTemporaryToken,
	VerifyUserMFA
);

userRouter.use(verifyOrganizationJWT);
userRouter.get("/organization/user/verify", VerifyUserAuth);

module.exports = userRouter;
