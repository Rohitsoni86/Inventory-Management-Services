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
	ForgotPassword,
	VerifyForgotPasswordOTP,
	ResetPasswordWithToken,
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

// Forgot Password Flow
userRouter.post("/organization/forgot-password", ForgotPassword);
userRouter.post("/organization/verify-otp", VerifyForgotPasswordOTP);
userRouter.post(
	"/organization/reset-password-with-token",
	ResetPasswordWithToken
);

userRouter.use(verifyOrganizationJWT);
userRouter.get("/organization/user/verify", VerifyUserAuth);
userRouter.put("/organization/reset-password", ResetPassword);

module.exports = userRouter;
