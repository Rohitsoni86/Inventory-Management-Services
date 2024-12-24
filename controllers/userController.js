const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const ErrorResponse = require("../utils/errorResponse");
// const { tenantUserSchema } = require("../models/TenantUser");
const moment = require("moment");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { default: mongoose } = require("mongoose");
const { default: axios } = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: "../config/config.env" });
const CryptoJS = require("crypto-js");
// const Tenants = require("../models/Tenants");
// const connectDB = require("./config/db");

const createNewUser = asyncHandler(async (req, res, next) => {
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
		adminFirstName,
		adminLastName,
		adminEmail,
		adminCountryCode,
		adminPhone,
		credentials, // Encrypted credentials
		adminFlagCode,
		roles,
	} = req.body;

	const encryptionKey = "rohit-soni-86";

	try {
		// Decrypt credentials
		const decryptedBytes = CryptoJS.AES.decrypt(credentials, encryptionKey);
		const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);

		// Check if the decrypted data is valid JSON
		if (decryptedData) {
			let parsedCredentials;
			try {
				parsedCredentials = JSON.parse(decryptedData); // Parse the decrypted data
			} catch (err) {
				return next(
					new ErrorResponse("Failed to parse decrypted credentials", 400)
				);
			}

			const { adminPassword, adminPhone } = parsedCredentials;

			// Validate the parsed credentials
			if (
				!adminPhone ||
				!adminPassword ||
				!Array.isArray(roles) ||
				!roles.length
			) {
				return next(new ErrorResponse(`All fields are required`, 400));
			}

			// Hash password
			const hashedPwd = await bcryptjs.hash(adminPassword, 10); // salt rounds
			const createdDate = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");

			const userObject = {
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
				adminFirstName,
				adminLastName,
				adminEmail,
				adminCountryCode,
				adminPhone,
				adminPassword: hashedPwd,
				adminFlagCode,
				roles,
				createdAt: createdDate,
			};

			// Save the user to the database (uncomment the line below to actually save it)
			// const organization = await TenantUserModel.create(userObject);

			res.status(201).json({
				success: true,
				data: userObject,
				message: `Registration Successful !`,
			});
		} else {
			return next(new ErrorResponse("Decrypted data is empty or invalid", 400));
		}
	} catch (err) {
		return next(new ErrorResponse("Error processing the request", 500));
	}
});

//this login is for user only
// const login = asyncHandler(async (req, res, next) => {
// 	console.log("login called");
// 	const { credentials } = req.body;
// 	const encryptionKey = "rohit-soni-86";
// 	const decryptedBytes = CryptoJS.AES.decrypt(credentials, encryptionKey);
// 	const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
// 	const { email, password } = JSON.parse(decryptedData);
// 	// Now `decryptedData` contains the original data
// 	const tenantDbName = req.params.hospitalId;
// 	const { tenantDb } = req;
// 	if (!email || !password || !tenantDbName) {
// 		return res.status(400).json({ message: "All fields are required" });
// 	}

// 	// Access the TenantUser model from the tenantDbConnection
// 	const TenantUserModel = tenantDb.model("TenantUser", tenantUserSchema);
// 	try {
// 		const foundUser = await TenantUserModel.findOne({
// 			$or: [
// 				{
// 					email: email,
// 				},
// 				{ phoneNo: email },
// 			],
// 		}).select("+password");
// 		// console.log(foundUser);

// 		if (!foundUser || !foundUser.active) {
// 			return next(new ErrorResponse("Invalid credentials", 401));
// 		}

// 		// console.log(foundUser);
// 		const match = await bcryptjs.compare(password, foundUser.password);

// 		if (!match) return res.status(401).json({ message: "Unauthorized User" });
// 		const roles = foundUser.roles;

// 		const accessToken = jwt.sign(
// 			{
// 				UserInfo: {
// 					username: foundUser.email,
// 					roles: foundUser.roles,
// 					id: foundUser.id,
// 					tname: req.params.hospitalId,
// 				},
// 			},
// 			process.env.ACCESS_TOKEN_SECRET,
// 			{ algorithm: "HS256", expiresIn: "60m" }
// 		);

// 		const refreshToken = jwt.sign(
// 			{ email: foundUser.email, tname: req.params.hospitalId },
// 			process.env.REFRESH_TOKEN_SECRET,
// 			{ algorithm: "HS256", expiresIn: "1d" }
// 		);
// 		// Saving refreshToken with current user
// 		foundUser.refreshToken = refreshToken;
// 		const result = await foundUser.save();

// 		// Create secure cookie with refresh token
// 		console.log();
// 		const isLocalhost =
// 			req.headers.origin &&
// 			(req.headers.origin.includes("localhost:3000") ||
// 				req.headers.origin.endsWith(".localhost:3000"));
// 		const isSecure =
// 			req.secure ||
// 			(isLocalhost && req.headers["x-forwarded-proto"] === "https");

// 		res.cookie("refreshToken", refreshToken, {
// 			httpOnly: true,
// 			secure: true,
// 			sameSite: isLocalhost ? "None" : "Strict",
// 			maxAge: 24 * 60 * 60 * 1000,
// 		});

// 		res.cookie("accessToken", accessToken, {
// 			httpOnly: true, //accessible only by web server
// 			secure: true,
// 			sameSite: isLocalhost ? "None" : "Strict",
// 			maxAge: 60 * 60 * 1000,
// 		});
// 		res.json({
// 			roles,
// 			accessToken,
// 			username: foundUser.name,
// 			email: foundUser.email,
// 			allowedAccess: foundUser.allowedAccess,
// 			reorder: foundUser.reorders,
// 		});
// 	} catch (error) {
// 		return next(new ErrorResponse("Invalid credentials", 401));
// 	} // Send accessToken containing username and roles
// 	// Send authorization roles and access token to user
// });

// @desc Login
// @route POST /auth
// @access Public
// const loginWithMFA = asyncHandler(async (req, res, next) => {
// 	const { email, password } = req.body;

// 	if (!email || !password) {
// 		return res.status(400).json({ message: "All fields are required" });
// 	}

// 	try {
// 		const foundUser = await User.findOne({ email }).select("+password");

// 		if (!foundUser || !foundUser.active) {
// 			return next(new ErrorResponse("Invalid credentials", 401));
// 		}

// 		console.log(foundUser);
// 		const match = await bcryptjs.compare(password, foundUser.password);

// 		if (!match) return res.status(401).json({ message: "Unauthorized" });
// 		const temporarytoken = jwt.sign(
// 			{
// 				email: foundUser.email,
// 				roles: foundUser.roles,
// 			},
// 			process.env.ACCESS_TOKEN_SECRET,
// 			{ algorithm: "HS256", expiresIn: "5m" }
// 		);
// 		res.cookie("temporarytoken", temporarytoken, {
// 			httpOnly: true, //accessible only by web server
// 			secure: true, //https
// 			sameSite: "None", //cross-site cookie
// 			maxAge: 5 * 60 * 1000,
// 		});
// 		if (foundUser.mfaEnabled && foundUser.mfaSecret) {
// 			return res.status(200).json({
// 				success: true,
// 				data: { mfaEnabled: foundUser.mfaEnabled, secret: foundUser.mfaSecret },
// 			});
// 		} else {
// 			const secret = speakeasy.generateSecret({ length: 20 });

// 			const customURL = `otpauth://totp/${encodeURIComponent(
// 				"Chikitsa"
// 			)}:${encodeURIComponent(foundUser.name)}?secret=${
// 				secret.base32
// 			}&issuer=${encodeURIComponent("Chikitsa")}`;
// 			qrcode.toDataURL(customURL, (err, data_url) => {
// 				return res.status(200).json({
// 					success: true,
// 					data: {
// 						mfaEnabled: foundUser.mfaEnabled,
// 						secret: secret.base32,
// 						qrcode: data_url,
// 					},
// 				});
// 			});
// 		}
// 	} catch (err) {
// 		return next(new ErrorResponse("Invalid credentials", 401));
// 	}
// });

// this is for admin
// const verifyMFA = asyncHandler(async (req, res, next) => {
// 	const { code, secret } = req.body;
// 	try {
// 		const user = req.user;
// 		const foundUser = await User.findOne({ email: user.email });
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
// 						username: foundUser.email,
// 						roles: foundUser.roles,
// 						id: foundUser.id,
// 					},
// 				},
// 				process.env.ACCESS_TOKEN_SECRET,
// 				{ algorithm: "HS256", expiresIn: "60m" }
// 			);

// 			const refreshToken = jwt.sign(
// 				{ email: foundUser.email },
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
// 			logger.info({ roles, accessToken, username: foundUser.name });
// 			res.status(200).json({
// 				success: true,
// 				data: { name: foundUser.name, userId: foundUser._id },
// 			});
// 		} else {
// 			res.status(400).json({ success: false, message: "Invalid code" });
// 		}
// 	} catch (error) {
// 		console.log(error);
// 		res.status(500).json({ success: false, data: "Something went wrong" });
// 	}
// });

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
// const refresh = (req, res, next) => {
// 	const { tenantDb } = req;
// 	// console.log(tenantDb);
// 	const cookies = req.cookies;

// 	console.log("hello world");
// 	if (!cookies?.jwt) return res.status(401).json({ message: "Unauthorized" });

// 	const refreshToken = cookies.jwt;
// 	// console.log(refreshToken);

// 	jwt.verify(
// 		refreshToken,
// 		process.env.REFRESH_TOKEN_SECRET,
// 		{ algorithms: ["HS256"] },
// 		asyncHandler(async (err, decoded) => {
// 			console.log(err, "refresh error");
// 			if (err) return res.status(403).json({ message: "Forbidden" });

// 			let TenantUserModel = tenantDb.model("TenantUser", tenantUserSchema);
// 			console.log(decoded.email);
// 			const foundUser = await TenantUserModel.findOne({
// 				email: decoded.email,
// 			}).exec();
// 			console.log(foundUser);
// 			if (!foundUser) return res.status(401).json({ message: "Unauthorized" });
// 			const accessToken = jwt.sign(
// 				{
// 					UserInfo: {
// 						username: foundUser.email,
// 						roles: foundUser.roles,
// 						id: foundUser.id,
// 						tname: decoded.tname,
// 					},
// 				},
// 				process.env.ACCESS_TOKEN_SECRET,
// 				{ expiresIn: "50m" }
// 			);

// 			const isLocalhost =
// 				req.headers.origin.includes("localhost:3000") ||
// 				req.headers.origin.endsWith(".localhost:3000");

// 			res.cookie("refreshToken", refreshToken, {
// 				httpOnly: true,
// 				secure: true,
// 				sameSite: isLocalhost ? "None" : "Strict",
// 				maxAge: 24 * 60 * 60 * 1000,
// 			});

// 			res.cookie("accessToken", accessToken, {
// 				httpOnly: true, //accessible only by web server
// 				secure: true,
// 				sameSite: isLocalhost ? "None" : "Strict",
// 				maxAge: 5 * 60 * 1000,
// 			});

// 			res.json({ accessToken });
// 		})
// 	);
// };

// const verifyAuth = asyncHandler(async (req, res, next) => {
// 	const { id, tname } = req.user;
// 	const token = req.cookies.accessToken;
// 	if (!token) {
// 		return res.status(403).json({ success: false, data: "Invalid Token" });
// 	}
// 	const { tenantDb, dbName } = req;
// 	if (req.user.roles.includes("integrator")) {
// 		return res.status(200).json({
// 			data: "success",
// 			id,
// 			roles: req.user.roles,
// 			username: req.user.username,
// 			tenantDbId: dbName,
// 		});
// 	}
// 	console.log("dbName");
// 	console.log(dbName);
// 	const TenantUserModel = tenantDb.model("TenantUser", tenantUserSchema);
// 	const user = await TenantUserModel.findById(id);
// 	if (user.active == false) {
// 		return res.status(401).json({ message: "USER BANNED" });
// 	}
// 	if (!user) {
// 		return res.status(403).json({ error: "You must be logged In." });
// 	}
// 	res.status(200).json({
// 		data: "success",
// 		id,
// 		roles: req.user.roles,
// 		username: user.name,
// 		email: user.email,
// 		tenantDbId: dbName,
// 		allowedAccess: user.allowedAccess,
// 		reorder: user.reorders,
// 	});
// });

// const verifyMFA = asyncHandler(async (req, res, next) => {
// 	const { code, secret } = req.body;

// 	const isValid = speakeasy.totp.verify({
// 		secret,
// 		encoding: "base32",
// 		token: code,
// 	});

// 	if (isValid) {
// 		res.json({ success: true, message: "MFA enabled successfully" });
// 	} else {
// 		res.json({ success: false, message: "Invalid code" });
// 	}
// });

module.exports = {
	createNewUser,
};
