const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const ErrorResponse = require("../utils/errorResponse");
const OrganizationAdminModel = require("../models/organizationAdminModel");
const Organization = require("../models/organizationModel");
const EmployeeUserModel = require("../models/organizationEmployeesModel");
const moment = require("moment");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { default: axios } = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: "../config/config.env" });
const CryptoJS = require("crypto-js");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const jwt = require("jsonwebtoken");
const logger = require("../middlewares/custom-logger");
const { UserModel: User } = require("../models/userModel");

const loginUser = asyncHandler(async (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "All fields are required" });
	}
	console.log("Founded Email Password", email, password);
	try {
		const foundUser = await User.findOne({
			email: email,
		});

		if (!foundUser || foundUser.active === false) {
			return next(new ErrorResponse("Invalid credentials", 401));
		}

		console.log("Founded User", foundUser);
		const match = await bcryptjs.compare(password, foundUser.password);

		console.log("Match Password", match);

		if (!match) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const temporarytoken = jwt.sign(
			{
				email: foundUser.email,
				roles: foundUser.roles,
			},
			process.env.ACCESS_TOKEN_SECRET,
			{ algorithm: "HS256", expiresIn: "5m" }
		);
		res.cookie("temporarytoken", temporarytoken, {
			httpOnly: true, //accessible only by web server
			secure: true, //https
			sameSite: "None", //cross-site cookie
			maxAge: 5 * 60 * 1000,
		});
		if (foundUser && foundUser.mfaEnabled) {
			return res.status(200).json({
				success: true,
				data: {
					mfaEnabled: foundUser.mfaEnabled,
					secret: foundUser.mfaSecret,
				},
			});
		} else if (foundEmpUser && foundEmpUser.mfaEnabled) {
			return res.status(200).json({
				success: true,
				data: {
					mfaEnabled: foundUser.mfaEnabled,
					secret: mfaEnabled,
					mfaSecret,
				},
			});
		} else {
			const secret = speakeasy.generateSecret({ length: 20 });
			console.log("MFA Not Found", secret);
			const customURL = `otpauth://totp/${encodeURIComponent(
				"Invento"
			)}:${encodeURIComponent(foundUser.email)}?secret=${
				secret.base32
			}&issuer=${encodeURIComponent("Invento")}`;
			qrcode.toDataURL(customURL, (err, data_url) => {
				return res.status(200).json({
					success: true,
					data: {
						mfaEnabled: foundUser.mfaEnabled,
						secret: secret.base32,
						qrcode: data_url,
					},
				});
			});
		}
	} catch (err) {
		console.log("Catching Error", err);
		return next(new ErrorResponse("Internal Server Error", 500));
	}
});

// const verifyUserMFA = asyncHandler(async (req, res, next) => {
// 	const { code, secret } = req.body;
// 	try {
// 		const user = req.user;

// 		let foundUser;
// 		let isAdmin;
// 		if (user.roles.includes("admin")) {
// 			foundUser = await OrganizationAdminModel.findOne({
// 				adminEmail: user.email,
// 			});
// 			isAdmin = true;
// 		}

// 		if (user.roles.includes("employee")) {
// 			foundUser = await EmployeeUserModel.findOne({
// 				email: user.email,
// 			});
// 			isAdmin = false;
// 		}

// 		if (foundUser.mfaEnabled && foundUser.mfaSecret !== secret) {
// 			return res.status(400).json({ success: false, data: "Invalid Secret" });
// 		}
// 		const isValid = speakeasy.totp.verify({
// 			secret,
// 			encoding: "base32",
// 			token: code,
// 		});

// 		if (isValid) {
// 			const roles = foundUser.roles;
// 			console.log(roles);

// 			const accessToken = jwt.sign(
// 				{
// 					UserInfo: {
// 						username: isAdmin ? foundUser.adminEmail : foundUser.password,
// 						roles: foundUser.roles,
// 						id: foundUser.id,
// 					},
// 				},
// 				process.env.ACCESS_TOKEN_SECRET,
// 				{ algorithm: "HS256", expiresIn: "60m" }
// 			);

// 			const refreshToken = jwt.sign(
// 				{ email: isAdmin ? foundUser.adminEmail : foundUser.password },
// 				process.env.REFRESH_TOKEN_SECRET,
// 				{ algorithm: "HS256", expiresIn: "1d" }
// 			);
// 			// Saving refreshToken with current user
// 			foundUser.refreshToken = refreshToken;
// 			foundUser.mfaSecret = secret;
// 			foundUser.mfaEnabled = true;
// 			const result = await foundUser.save();
// 			res.clearCookie("temporarytoken", {
// 				httpOnly: true,
// 				sameSite: "None",
// 				secure: true,
// 			});
// 			// Create secure cookie with refresh token
// 			res.cookie("refreshToken", refreshToken, {
// 				httpOnly: true, //accessible only by web server
// 				secure: true, //https
// 				sameSite: "None", //cross-site cookie
// 				maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
// 			});

// 			res.cookie("accessToken", accessToken, {
// 				httpOnly: true, //accessible only by web server
// 				secure: true, //https
// 				sameSite: "None", //cross-site cookie
// 				maxAge: 60 * 60 * 1000,
// 			});

// 			// Send accessToken containing username and roles
// 			// Send authorization roles and access token to user
// 			logger.info({
// 				roles,
// 				accessToken,
// 				username: isAdmin ? foundUser.adminFirstName : foundUser.name,
// 			});
// 			res.status(200).json({
// 				success: true,
// 				data: {
// 					name: isAdmin ? foundUser.adminFirstName : foundUser.name,
// 					userId: foundUser._id,
// 				},
// 			});
// 		} else {
// 			res.status(400).json({ success: false, message: "Invalid code" });
// 		}
// 	} catch (error) {
// 		console.log(error);
// 		res.status(500).json({ success: false, data: "Something went wrong" });
// 	}
// });

// verify Super admin you need to make token different for both
const verifyUserMFA = asyncHandler(async (req, res, next) => {
	const { code, secret } = req.body;
	try {
		const user = req.user;
		let foundUser;
		let isAdmin = false;
		console.log("User Req", user);

		// Check for roles and fetch user data
		if (user.roles.includes("admin")) {
			foundUser = await User.findOne({
				email: user.email,
			}).populate("organizations");
			isAdmin = true;
		}

		// Check if the role is valid, if not return an error
		if (!foundUser) {
			return res
				.status(403)
				.json({ success: false, message: "User not found" });
		}

		if (foundUser.mfaEnabled && foundUser.mfaSecret !== secret) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid MFA Secret" });
		}

		// Verify TOTP code
		const isValid = speakeasy.totp.verify({
			secret,
			encoding: "base32",
			token: code,
		});

		if (isValid) {
			const roles = foundUser.roles;
			const accessToken = jwt.sign(
				{
					UserInfo: {
						username: foundUser.email,
						roles: foundUser.roles,
						id: foundUser._id,
					},
				},
				process.env.ACCESS_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "60m" }
			);

			const refreshToken = jwt.sign(
				{ email: foundUser.email },
				process.env.REFRESH_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "1d" }
			);

			// Save refresh token and enable MFA
			foundUser.refreshToken = refreshToken;
			foundUser.mfaSecret = secret;
			foundUser.mfaEnabled = true;
			const result = await foundUser.save();

			// Clear old cookie and set new ones
			res.clearCookie("temporarytoken", {
				httpOnly: true,
				sameSite: "None",
				secure: true,
			});

			res.cookie("refreshToken", refreshToken, {
				httpOnly: true,
				secure: true,
				sameSite: "None",
				maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week expiry
			});

			res.cookie("accessToken", accessToken, {
				httpOnly: true,
				secure: true,
				sameSite: "None",
				maxAge: 60 * 60 * 1000, // 1 hour expiry
			});

			logger.info({
				roles,
				accessToken,
				username: foundUser.name,
			});

			res.status(200).json({
				success: true,
				data: {
					name: foundUser.name,
					userId: foundUser._id,
				},
			});
		} else {
			res.status(400).json({ success: false, message: "Invalid MFA code" });
		}
	} catch (error) {
		console.error("Error User Verification", error);
		res.status(500).json({ success: false, message: "Something went wrong" });
	}
});

const refreshUserToken = async (req, res, next) => {
	const cookies = req.cookies;

	// Check if the JWT refresh token is present in cookies
	if (!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });

	const refreshToken = cookies.jwt;

	// Verify the refresh token
	jwt.verify(
		refreshToken,
		process.env.REFRESH_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		asyncHandler(async (err, decoded) => {
			if (err) return res.status(403).json({ message: "Forbidden" });

			// Depending on the decoded information, fetch the user either from Admins or Employees
			let foundUser;
			let isAdmin = false;

			// Check if the decoded email corresponds to an Admin or Employee
			if (decoded.roles && decoded.roles.includes("admin")) {
				// Assuming you have a model for Admins, adjust this based on your actual model.
				foundUser = await OrganizationAdminModel.findOne({
					adminEmail: decoded.email,
				});
				isAdmin = true; // User is an admin
			} else if (decoded.roles && decoded.roles.includes("employee")) {
				// Assuming you have a model for Employees, adjust this based on your actual model.
				foundUser = await EmployeeUserModel.findOne({
					email: decoded.email,
				});
				isAdmin = false; // User is an employee
			}

			if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

			// Generate a new access token based on whether the user is an admin or employee
			const accessToken = jwt.sign(
				{
					UserInfo: {
						username: isAdmin ? foundUser.adminEmail : foundUser.email,
						roles: foundUser.roles,
						id: foundUser._id, // Make sure you're using _id, not id in Mongoose
					},
				},
				isAdmin
					? process.env.ADMIN_ACCESS_TOKEN_SECRET
					: process.env.EMPLOYEE_ACCESS_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "15m" } // Adjust expiration as necessary
			);

			// Set the new access token in a secure cookie
			res.cookie("accessToken", accessToken, {
				httpOnly: true, //accessible only by web server
				secure: true, // Use HTTPS for security
				sameSite: "None", // For cross-site cookies
				maxAge: 15 * 60 * 1000, // Same as the access token expiration (15 minutes)
			});

			// Respond with the new access token
			res.json({ accessToken });
		})
	);
};

const verifyUserAuth = asyncHandler(async (req, res, next) => {
	const { id } = req.user; // Assuming `id` is set by the token or middleware
	const token = req.cookies.accessToken; // Access token from cookies

	// If no access token is found, return a 403 error
	if (!token) {
		return res.status(403).json({ success: false, message: "Invalid Token" });
	}

	// Find the user by ID, first checking if the user is a SuperAdmin or Admin
	let user;
	let isAdmin = false;

	// Check if the user is an Admin
	if (req.user.roles.includes("admin")) {
		user = await OrganizationAdminModel.findById(id).populate(
			"organizations",
			"legalName"
		); // Use Admin model
		isAdmin = true; // Mark as Admin
	}

	// Check if the user is an Admin
	if (req.user.roles.includes("employee")) {
		user = await EmployeeUserModel.findById(id); // Use Admin model
		isAdmin = false; // Mark as Admin
	}

	// If no user is found (neither SuperAdmin nor Admin), return a 403 error
	if (!user) {
		return res
			.status(403)
			.json({ success: false, message: "You must be logged in." });
	}

	// Check if the user is banned or inactive (for both SuperAdmin and Admin)
	if (user.active === false) {
		return res.status(401).json({ message: "USER BANNED" });
	}

	// If user is found and active, pass on to the next middleware or route handler
	res.status(200).json({
		success: true,
		data: "User Authenticated Successfully",
		id,
		roles: req.user.roles, // Roles from token payload
		username: isAdmin
			? `${user.adminFirstName + user.adminLastName}`
			: user.name,
		email: isAdmin ? user.adminEmail : user.email,
		organizationDetails: user.organizations,
	});
});

module.exports = {
	loginUser,
	verifyUserMFA,
	refreshUserToken,
	verifyUserAuth,
};
