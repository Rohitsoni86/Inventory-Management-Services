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
	ResetPassword,
} = require("../controllers/authcontroller");
const loginLimiter = require("../middlewares/loginLimiter");

const userRouter = express.Router();

// authentication
userRouter.route("/organization/signup").post(SignUp);
userRouter.route("/organization/login", loginLimiter).post(LoginUser);
userRouter.post(
	"/organization/user/verify-MFA",
	verifyTemporaryToken,
	VerifyUserMFA
);

userRouter.use(verifyOrganizationJWT);
userRouter.get("/organization/user/verify", VerifyUserAuth);
userRouter.put("/organization/reset-password", ResetPassword);

module.exports = userRouter;
