const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const ErrorResponse = require("../utils/errorResponse");
const Organization = require("../models/organizationModel");
const moment = require("moment");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { default: mongoose } = require("mongoose");
const { default: axios } = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: "../config/config.env" });
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const logger = require("../middlewares/custom-logger");
const User = require("../models/userModel");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const Joi = require("joi");

const registerSchema = Joi.object({
	legalName: Joi.string().min(2).required(),
	registrationNumber: Joi.string().optional(),
	email: Joi.string().email().required(),
	countryCode: Joi.string()
		.pattern(/^\+?[1-9]\d{1,14}$/)
		.required(),
	phone: Joi.string()
		.pattern(/^\d{10,15}$/)
		.required(),
	address: Joi.string().required(),
	city: Joi.string().required(),
	state: Joi.string().required(),
	country: Joi.string().required(),
	postalCode: Joi.string().required(),
	companySize: Joi.string().required(),
	flagCode: Joi.string().max(2).required(),
	user: Joi.object({
		firstName: Joi.string().min(2).required(),
		middleName: Joi.string().optional(),
		lastName: Joi.string().min(2).required(),
		email: Joi.string().email().required(),
		password: Joi.string().min(8).required(),
		confirmPassword: Joi.string().min(8).optional(),
		countryCode: Joi.string().required(),
		flagCode: Joi.string().max(2).required(),
		phone: Joi.string()
			.pattern(/^\d{10,15}$/)
			.required(),
	}).required(),
});

const SignUp = asyncHandler(async (req, res, next) => {
	// validate with joi
	const { error } = registerSchema.validate(req.body);
	if (error) return next(new ErrorResponse(error.details[0].message, 400));

	const {
		legalName,
		registrationNumber,
		email,
		countryCode,
		phone,
		address,
		city,
		state,
		country,
		postalCode,
		companySize,
		flagCode,
		user,
		roles,
		active,
	} = req.body;

	// check for exsisting user
	const existingUser = await User.findOne({ email: user.email });
	if (existingUser)
		return next(new ErrorResponse("User with this email already exists", 400));

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const hashedPwd = await bcryptjs.hash(user.password, 10);
		const [userDoc] = await User.create(
			[
				{
					...user,
					password: hashedPwd,
					roles: ["admin"],
					active: true,
				},
			],
			{ session }
		);

		const [orgDoc] = await Organization.create(
			[
				{
					legalName,
					registrationNumber,
					email,
					countryCode,
					phone,
					address,
					city,
					state,
					country,
					postalCode,
					companySize,
					flagCode,
					createdBy: userDoc._id,
					admins: [userDoc._id],
					active,
				},
			],
			{ session }
		);

		userDoc.organizations.push(orgDoc._id);
		await userDoc.save({ session });

		await session.commitTransaction();

		logger.info(`New organization created: ${orgDoc.legalName}`);

		res.status(201).json({
			success: true,
			data: { user: userDoc, organization: orgDoc },
			message: "Registration Successful!",
		});
	} catch (err) {
		await session.abortTransaction();
		logger.error(`Registration failed: ${err.message}`);
		return next(
			new ErrorResponse(err.message || "Error processing request", 500)
		);
	} finally {
		session.endSession();
	}
});

const LoginUser = asyncHandler(async (req, res, next) => {
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

const VerifyUserMFA = asyncHandler(async (req, res, next) => {
	const { code, secret } = req.body;
	try {
		const user = req.user;
		let foundUser;
		let isAdmin = false;
		console.log("User Req", user);

		foundUser = await User.findOne({
			email: user.email,
		}).populate("organizations");

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

		let nameOfUser = `${foundUser.firstName} ${foundUser.middleName ?? ""} ${
			foundUser.lastName
		}`;

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
				username: nameOfUser,
			});

			res.status(200).json({
				success: true,
				data: {
					name: nameOfUser,
					userId: foundUser._id,
					role: foundUser.roles,
					// organizationDetails: foundUser.organizations,
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

const RefreshUserToken = async (req, res, next) => {
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
				foundUser = await User.findOne({
					email: decoded.email,
				});
				// isAdmin = true; // User is an admin
			}

			if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

			// Generate a new access token based on whether the user is an admin or employee
			const accessToken = jwt.sign(
				{
					UserInfo: {
						username: foundUser.email,
						roles: foundUser.roles,
						id: foundUser._id, // Make sure you're using _id, not id in Mongoose
					},
				},
				// isAdmin
				// 	? process.env.ADMIN_ACCESS_TOKEN_SECRET
				// 	: process.env.EMPLOYEE_ACCESS_TOKEN_SECRET,
				process.env.ACCESS_TOKEN_SECRET,
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

const VerifyUserAuth = asyncHandler(async (req, res, next) => {
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
		user = await User.findById(id).populate("organizations", "legalName"); // Use User model
		// isAdmin = true; // Mark as Admin
	}

	// // Check if the user is an Admin
	// if (req.user.roles.includes("employee")) {
	// 	user = await EmployeeUserModel.findById(id); // Use Admin model
	// 	isAdmin = false; // Mark as Admin
	// }

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
		username: user.name,
		email: user.email,
		organizationDetails: user.organizations,
	});
});

module.exports = {
	SignUp,
	LoginUser,
	VerifyUserMFA,
	RefreshUserToken,
	VerifyUserAuth,
};
