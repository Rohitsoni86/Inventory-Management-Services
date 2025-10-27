const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const ErrorResponse = require("../utils/errorResponse");
const OrganizationAdminModel = require("../models/organizationAdminModel");
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
const { default: registerSchema } = require("../schemas/registerSchema");

const createNewUser = asyncHandler(async (req, res, next) => {
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

const loginAdmin = asyncHandler(async (req, res, next) => {
	console.log("login called");
	const { email, password } = req.body;
	const encryptionKey = "rohit-soni-86";
	// const decryptedBytes = CryptoJS.AES.decrypt(credentials, encryptionKey);
	// const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
	// const { email, password } = JSON.parse(decryptedData);
	// Now `decryptedData` contains the original data
	// const tenantDbName = req.params.hospitalId;
	// const { tenantDb } = req;

	if (!email || !password) {
		return res.status(400).json({ message: "All fields are required" });
	}

	try {
		const foundUser = await OrganizationAdminModel.findOne({
			adminEmail: email,
		}).select("+password");
		// .populate({
		// 	path: "organizations",
		// 	select: "legalName email phone address city state country", // Fields to include in the populated data
		// }); // Populate the organizations;
		console.log("Found Admin", foundUser);

		const organizationsDetails = await Organization.findOne(
			foundUser.organizations[0]
		);

		if (!foundUser || !foundUser.active) {
			return next(new ErrorResponse("Invalid credentials", 401));
		}

		// console.log(foundUser);
		const match = await bcryptjs.compare(password, foundUser.adminPassword);

		if (!match) return res.status(401).json({ message: "Unauthorized User" });
		const roles = foundUser.roles;

		const accessToken = jwt.sign(
			{
				UserInfo: {
					username: foundUser.adminEmail,
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
		// foundUser.refreshToken = refreshToken;
		// const result = await foundUser.save();

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
		res.json({
			roles,
			accessToken,
			username: `${foundUser.adminFirstName + foundUser.adminLastName}`,
			email: foundUser.adminEmail,
			organizationDetails: { ...organizationsDetails },
		});
	} catch (error) {
		console.log("Login Admin Error", error);
		return next(new ErrorResponse("Invalid credentials", 401));
	}
});

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
	loginAdmin,
};
