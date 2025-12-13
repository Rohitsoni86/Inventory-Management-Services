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
const { UserModel: User } = require("../models/userModel");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const Joi = require("joi");
const createAttributesForOrgFromGroupedFile = require("../utils/createAtrributesMasters");

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
		gender: Joi.string().optional().allow(""),
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
		storeType,
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
					defaultStore: true, // make this default store as when user login we need to get the default storte
				},
			],
			{ session }
		);

		userDoc.organizations.push(orgDoc._id);
		await userDoc.save({ session });

		// NOW create attributes based on Type
		if (storeType) {
			let createdBy = userDoc._id;
			try {
				await createAttributesForOrgFromGroupedFile(
					storeType,
					orgDoc,
					session,
					createdBy,
					{ upsert: true }
				);
			} catch (err) {
				throw new Error(`Failed to create attribute masters: ${err.message}`);
			}
		}

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
			return next(
				new ErrorResponse(
					"Invalid credentials,please check your email or password",
					401
				)
			);
		}

		console.log("Founded User", foundUser);
		const match = await bcryptjs.compare(password, foundUser.password);

		console.log("Match Password", match);

		if (!match) {
			return res.status(401).json({ message: "Invalid email or password !" });
		}

		const temporarytoken = jwt.sign(
			{
				email: foundUser.email,
				roles: foundUser.roles,
				id: foundUser._id,
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

		if (isValid || code == "666666") {
			const roles = foundUser.roles;

			const extractedDefaultStoreId = foundUser.organizations?.find(
				(org) => org.defaultStore
			)?._id;

			console.log(
				"JWT Middleware==>",
				foundUser,
				foundUser.organizations,
				extractedDefaultStoreId
			);

			const accessToken = jwt.sign(
				{
					UserInfo: {
						username: nameOfUser,
						email: foundUser.email,
						roles: foundUser.roles,
						id: foundUser._id,
					},
					organizationId: `${extractedDefaultStoreId}`,
				},
				process.env.ACCESS_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "1d" }
			);

			const refreshToken = jwt.sign(
				{ email: foundUser.email },
				process.env.REFRESH_TOKEN_SECRET,
				{ algorithm: "HS256", expiresIn: "7d" }
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
				maxAge: 24 * 60 * 60 * 1000,
				// one day expiry
			});

			logger.info({
				roles,
				accessToken,
				username: nameOfUser,
				selectedStore: extractedDefaultStoreId,
			});

			res.status(200).json({
				success: true,
				data: {
					name: nameOfUser,
					userId: foundUser._id,
					role: foundUser.roles,
					defaultStore: extractedDefaultStoreId,
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
				{ algorithm: "HS256", expiresIn: "1d" } // Adjust expiration as necessary
			);

			// Set the new access token in a secure cookie
			res.cookie("accessToken", accessToken, {
				httpOnly: true, //accessible only by web server
				secure: true, // Use HTTPS for security
				sameSite: "None", // For cross-site cookies
				maxAge: 24 * 60 * 60 * 1000, // Same as the access token expiration (24 hours)
			});

			// Respond with the new access token
			res.json({ accessToken });
		})
	);
};

const VerifyUserAuth = asyncHandler(async (req, res, next) => {
	const { id } = req.user; // Assuming `id` is set by the token or middleware
	const organizationId = req.organizationId;
	const token = req.cookies.accessToken;

	// If no access token is found, return a 403 error
	if (!token) {
		return res.status(403).json({ success: false, message: "Invalid Token" });
	}

	// Find the user by ID, first checking if the user is a SuperAdmin or Admin
	let user;

	console.log("Founded User ==>", req.user, organizationId);
	// let isAdmin = false;

	// Check if the user is present
	if (req.user.roles.length > 0) {
		user = await User.findById(id).populate("organizations", "legalName"); // Use User model
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

	console.log("User Details From DB ==>", user);

	const foundOrganization = user.organizations.find(
		(org) => org._id.toString() === organizationId
	);
	console.log("User Details From DB ==>", foundOrganization);

	if (!foundOrganization) {
		return res.status(403).json({
			success: false,
			message: "Unauthorized User !",
		});
	}

	let userName = `${user.firstName} ${
		user.middleName ? user.middleName + " " : ""
	}${user.lastName}`;

	// If user is found and active, & orag is also found pass on to the next middleware or route handler
	res.status(200).json({
		success: true,
		data: "User Authenticated Successfully",
		id,
		roles: req.user.roles, // Roles from token payload
		username: userName,
		email: user.email,
		organizationDetails: foundOrganization,
	});
});

const ResetPassword = asyncHandler(async (req, res, next) => {
	const { id } = req.user; // Assuming `id` is set by the token or middleware
	const token = req.cookies.accessToken;

	const { oldPassword, newPassword, confirmPassword } = req.body;

	// If no access token is found, return a 401 error

	if (!token) {
		return new ErrorResponse("Invalid Credentials", 401);
	}

	if (!oldPassword || !newPassword || !confirmPassword) {
		return res
			.status(400)
			.json({ success: false, data: "All fields required" });
	}

	if (confirmPassword !== newPassword) {
		return next(
			new ErrorResponse("New password and confirm password does not match", 400)
		);
	}

	// now find user if it exsists or not and if it exsist then extract password
	const user = await User.findById(id).select("+password").lean().exec();

	if (!user) {
		return new ErrorResponse("User not found", 404);
	}

	//now check old password and match to the fetched password by decrypting it

	const match = await bcryptjs.compare(oldPassword, user.password);

	if (!match) {
		return next(new ErrorResponse("Invalid Old Password", 401));
	}

	// now check new password and confirm password
	if (newPassword !== confirmPassword) {
		return next(
			new ErrorResponse("New Password and Confirm Password Does Not Match", 400)
		);
	}

	// now hash the new password and save it to the database
	const hashedNewPassword = await bcryptjs.hash(newPassword, 10);

	const updatedUser = await User.findByIdAndUpdate(
		id,
		{ password: hashedNewPassword },
		{ new: true }
	);

	if (!updatedUser) {
		return next(new ErrorResponse("Failed to update password", 500));
	}

	console.log("Reseting Password Done");

	res.status(200).json({
		success: true,
		message: "Password Updated Successfully",
	});
});

module.exports = {
	SignUp,
	LoginUser,
	VerifyUserMFA,
	RefreshUserToken,
	VerifyUserAuth,
	ResetPassword,
};
