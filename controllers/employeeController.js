const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const ErrorResponse = require("../utils/errorResponse");
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

const createEmployee = asyncHandler(async (req, res, next) => {
	console.log("Create Employee Called", req.body);
	const {
		name,
		honorific,
		gender,
		roles,
		alternatePhoneNo,
		// credentials,
		password,
		phoneNo,
		email,
		active,
		// createdAt,
		currentLocation,
		// refreshToken,
	} = req.body;

	const encryptionKey = "rohit-soni-86";

	try {
		// Decrypt credentials
		// const decryptedBytes = CryptoJS.AES.decrypt(credentials, encryptionKey);
		// const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);

		// Check if the decrypted data is valid JSON
		// if (decryptedData) {
		// 	let parsedCredentials;
		// 	try {
		// 		parsedCredentials = JSON.parse(decryptedData); // Parse the decrypted data
		// 	} catch (err) {
		// 		return next(
		// 			new ErrorResponse("Failed to parse decrypted credentials", 400)
		// 		);
		// 	}

		// 	const { password, phoneNo, email } = parsedCredentials;

		// }

		// Validate the parsed credentials
		if (!phoneNo || !password || !Array.isArray(roles) || !roles.length) {
			return next(new ErrorResponse(`All fields are required`, 400));
		}

		// Hash password
		const hashedPwd = await bcryptjs.hash(password, 10); // salt rounds
		const createdDate = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");

		const userObject = {
			name,
			email,
			honorific,
			gender,
			phoneNo,
			roles,
			alternatePhoneNo,
			password: hashedPwd,
			active,
			currentLocation,
			refreshToken: "",
			createdAt: createdDate,
		};

		const superAdminUser = await EmployeeUserModel.create(userObject);
		console.log("Super Admin Created", superAdminUser);
		if (superAdminUser) {
			res.status(201).json({
				success: true,
				data: userObject,
				message: `Registration Successful !`,
			});
		} else {
			return next(new ErrorResponse("Error processing the request", 500));
		}
	} catch (err) {
		//  else {
		// 	return next(new ErrorResponse("Decrypted data is empty or invalid", 400));
		// }
		// }

		console.log("Error", err);

		return next(new ErrorResponse("Error processing the request", 500));
	}
});

const loginEmployee = asyncHandler(async (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "All fields are required" });
	}
	console.log("Founded Email Password", email, password);
	try {
		const foundUser = await EmployeeUserModel.findOne({ email });

		if (!foundUser || foundUser.active === false) {
			return next(new ErrorResponse("Invalid credentials", 401));
		}

		console.log("Founded User", foundUser);
		const match = await bcryptjs.compare(password, foundUser.password);
		console.log("Match Password", match);

		if (!match) {
			return res.status(401).json({ message: "Unauthorized" });
		}
		const accessToken = jwt.sign(
			{
				UserInfo: {
					username: foundUser.email,
					roles: foundUser.roles,
					id: foundUser.id,
				},
			},
			process.env.ACCESS_TOKEN_SECRET,
			{ algorithm: "HS256", expiresIn: "60m" }
		);

		const refreshToken = jwt.sign(
			{ email: foundUser.email, tname: req.params.hospitalId },
			process.env.REFRESH_TOKEN_SECRET,
			{ algorithm: "HS256", expiresIn: "1d" }
		);

		// Saving refreshToken with current user
		foundUser.refreshToken = refreshToken;
		const result = await foundUser.save();
		const config = {
			headers: {
				Cookie: `accessToken=${accessToken}`,
			},
		};

		res.cookie("accessToken", accessToken, {
			httpOnly: true, //accessible only by web server
			secure: true, //https
			sameSite: "None", //cross-site cookie
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		// Create secure cookie with refresh token
		const isLocalhost =
			req.headers.origin &&
			(req.headers.origin.includes("localhost:3000") ||
				req.headers.origin.endsWith(".localhost:3000"));
		const isSecure =
			req.secure ||
			(isLocalhost && req.headers["x-forwarded-proto"] === "https");

		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: isLocalhost ? "None" : "Strict",
			maxAge: 24 * 60 * 60 * 1000,
		});

		res.cookie("accessToken", accessToken, {
			httpOnly: true, //accessible only by web server
			secure: true,
			sameSite: isLocalhost ? "None" : "Strict",
			maxAge: 60 * 60 * 1000,
		});

		res.status(200).json({
			success: true,
			// roles,
			accessToken,
			refreshToken: refreshToken,
			id: foundUser._id,
			username: foundUser.name,
			email: foundUser.email,
		});
	} catch (err) {
		console.log("Catching Error", err);
		return next(new ErrorResponse("Internal Server Error", 500));
	}
});

// verify Employee
const verifyEmployee = asyncHandler(async (req, res, next) => {
	const { id } = req.user;
	const token = req.cookies.accessToken;
	if (!token) {
		return res.status(403).json({ success: false, data: "Invalid Token" });
	}

	const user = await EmployeeUserModel.findById(id);
	if (user.active == false) {
		return res.status(401).json({ message: "USER BANNED" });
	}
	if (!user) {
		return res.status(403).json({ error: "You must be logged In." });
	}
	const accessToken = jwt.sign(
		{
			UserInfo: {
				username: foundUser.email,
				roles: foundUser.roles,
				id: foundUser.id,
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

	// Saving refreshToken with current user
	foundUser.refreshToken = refreshToken;
	const result = await foundUser.save();
	const config = {
		headers: {
			Cookie: `accessToken=${accessToken}`,
		},
	};

	res.cookie("accessToken", accessToken, {
		httpOnly: true, //accessible only by web server
		secure: true, //https
		sameSite: "None", //cross-site cookie
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});

	// Create secure cookie with refresh token
	const isLocalhost =
		req.headers.origin &&
		(req.headers.origin.includes("localhost:3000") ||
			req.headers.origin.endsWith(".localhost:3000"));
	const isSecure =
		req.secure || (isLocalhost && req.headers["x-forwarded-proto"] === "https");

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: isLocalhost ? "None" : "Strict",
		maxAge: 24 * 60 * 60 * 1000,
	});

	res.cookie("accessToken", accessToken, {
		httpOnly: true, //accessible only by web server
		secure: true,
		sameSite: isLocalhost ? "None" : "Strict",
		maxAge: 60 * 60 * 1000,
	});

	res.status(200).json({
		success: true,
		// roles,
		accessToken,
		refreshToken: refreshToken,
		id: foundUser._id,
		username: foundUser.name,
		email: foundUser.email,
	});
});

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired

// const verifyBlacklistToken = asyncHandler(async (req, res, next) => {
// 	const token = req.cookies.accessToken;
// 	if (!token) {
// 		return res.status(403).json({ success: false, data: "Invalid Token" });
// 	}
// 	let chikitsaDb;
// 	if (DBConnectionsList["chikitsa"]) {
// 		chikitsaDb = DBConnectionsList["chikitsa"].useDb("chikitsa");
// 	} else {
// 		DBConnectionsList["chikitsa"] = mongoose.createConnection(
// 			`mongodb+srv://${process.env.MONGO_URL}/` + "chikitsa",
// 			{ useNewUrlParser: true, useUnifiedTopology: true }
// 		);

// 		chikitsaDb = DBConnectionsList["chikitsa"].useDb("chikitsa");
// 	}
// 	const TokenBlacklistModel = chikitsaDb.model(
// 		"TokenBlacklist",
// 		tokenBlacklistSchema
// 	);
// 	const myToken = await TokenBlacklistModel.findOne({ token: token });
// 	const isLocalhost =
// 		req.headers.origin.includes("localhost:3000") ||
// 		req.headers.origin.endsWith(".localhost:3000");
// 	if (myToken) {
// 		res.clearcookie("refreshToken", {
// 			httpOnly: true,
// 			sameSite: isLocalhost ? "None" : "Strict",
// 			secure: true,
// 		});
// 		res.clearCookie("accessToken", {
// 			httpOnly: true,
// 			sameSite: isLocalhost ? "None" : "Strict",
// 			secure: true,
// 		});
// 		return res.status(403).json({ success: false, data: "Invalid Token" });
// 	}
// 	res.status(200).json({ success: true, data: "Verified" });
// });

const refresh = (req, res, next) => {
	const cookies = req.cookies;

	if (!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });

	const refreshToken = cookies.jwt;

	jwt.verify(
		refreshToken,
		process.env.REFRESH_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		asyncHandler(async (err, decoded) => {
			if (err) return res.status(403).json({ message: "Forbidden" });

			const foundUser = await User.findOne({
				email: decoded.email,
			}).exec();

			if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

			const accessToken = jwt.sign(
				{
					UserInfo: {
						username: foundUser.email,
						roles: foundUser.roles,
						id: foundUser.id,
					},
				},
				process.env.ACCESS_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "60m" }
			);

			const refreshToken = jwt.sign(
				{ email: foundUser.email, tname: req.params.hospitalId },
				process.env.REFRESH_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "1d" }
			);

			// Saving refreshToken with current user
			foundUser.refreshToken = refreshToken;
			const result = await foundUser.save();
			const config = {
				headers: {
					Cookie: `accessToken=${accessToken}`,
				},
			};

			res.cookie("accessToken", accessToken, {
				httpOnly: true, //accessible only by web server
				secure: true, //https
				sameSite: "None", //cross-site cookie
				maxAge: 7 * 24 * 60 * 60 * 1000,
			});

			// Create secure cookie with refresh token
			const isLocalhost =
				req.headers.origin &&
				(req.headers.origin.includes("localhost:3000") ||
					req.headers.origin.endsWith(".localhost:3000"));
			const isSecure =
				req.secure ||
				(isLocalhost && req.headers["x-forwarded-proto"] === "https");

			res.cookie("refreshToken", refreshToken, {
				httpOnly: true,
				secure: true,
				sameSite: isLocalhost ? "None" : "Strict",
				maxAge: 24 * 60 * 60 * 1000,
			});

			res.cookie("accessToken", accessToken, {
				httpOnly: true, //accessible only by web server
				secure: true,
				sameSite: isLocalhost ? "None" : "Strict",
				maxAge: 60 * 60 * 1000,
			});

			res.status(200).json({
				success: true,
				// roles,
				accessToken,
				refreshToken: refreshToken,
				id: foundUser._id,
				username: foundUser.name,
				email: foundUser.email,
			});
		})
	);
};

module.exports = {
	createEmployee,
	loginEmployee,
	verifyEmployee,
	refresh,
};
