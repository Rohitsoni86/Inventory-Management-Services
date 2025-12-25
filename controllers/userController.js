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
dotenv.config();
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const logger = require("../middlewares/custom-logger");
const { UserModel: User } = require("../models/userModel");
const Joi = require("joi");

const userCreationValidationSchema = Joi.object({
	firstName: Joi.string().min(2).max(50).required(),
	lastName: Joi.string().min(2).max(50).required(),
	email: Joi.string().email().required(),
	phone: Joi.string()
		.pattern(/^\d{10,15}$/)
		.required(),
	address: Joi.string().optional().allow(""),
	city: Joi.string().optional().allow(""),
	state: Joi.string().optional().allow(""),
	country: Joi.string().optional().allow(""),
	postalCode: Joi.string().optional().allow(""),
	flagCode: Joi.string().optional(),
	roles: Joi.array()
		.optional()
		.items(Joi.string().valid("admin", "manager", "employee")),
	honorific: Joi.string().optional().allow(""),
	middleName: Joi.string().min(2).max(50).allow("").optional(),
	countryCode: Joi.string()
		.pattern(/^\+?[1-9]\d{1,14}$/)
		.optional(),
	gender: Joi.string().optional().allow(""),
	password: Joi.string().optional().allow(""),
	confirmPassword: Joi.string().optional().allow(""),
});

async function generateUserCode(organizationId, roles = []) {
	const isEmployee = roles.includes("employee");
	const codeField = isEmployee ? "employeeCode" : "userCode";
	const prefix = isEmployee ? "EMPL" : "USER";

	const lastUser = await User.findOne(
		{ organizations: organizationId, [codeField]: { $exists: true } },
		{ [codeField]: 1 }
	)
		.sort({ createdAt: -1 })
		.lean();

	let lastCode = lastUser ? lastUser[codeField] : "";

	if (!lastCode) {
		return `${prefix}-0001`;
	}

	const match = lastCode.match(/(\d+)$/);
	if (!match) return `${prefix}-0001`;

	const nextNum = String(parseInt(match[1], 10) + 1).padStart(4, "0");
	return `${prefix}-${nextNum}`;
}

const createNewOrganizationUser = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;
	const creator = req.user;

	console.log("✅ Creator ==>", creator);
	console.log("✅ 2 Creator ==>", req.user);

	if (!creator?.roles?.includes("admin")) {
		return next(
			new ErrorResponse(
				"You are not authorized to create a new user in this organization.",
				403
			)
		);
	}

	req.body.honorific = req.body.honorific || "Miss";

	const { error } = userCreationValidationSchema.validate(req.body);
	if (error) {
		return next(
			new ErrorResponse(`Validation Error: ${error.details[0].message}`, 400)
		);
	}

	const {
		firstName,
		lastName,
		email,
		roles = ["employee"],
		...otherDetails
	} = req.body;

	const permittedRoles = ["admin", "manager", "employee"];
	const isRoleCreationAllowed = roles.every((role) =>
		permittedRoles.includes(role)
	);

	if (!isRoleCreationAllowed) {
		return next(
			new ErrorResponse(
				`You can only create users with roles: ${permittedRoles.join(", ")}.`,
				400
			)
		);
	}

	const userExists = await User.findOne({
		email,
		organizations: organizationId,
	});

	if (userExists) {
		return next(
			new ErrorResponse(
				"A user with this email already exists in this organization.",
				409
			)
		);
	}

	const userCode = await generateUserCode(organizationId, roles);
	const codeField = roles.includes("employee") ? "employeeCode" : "userCode";

	let { password } = req.body;
	if (!password) {
		const safeFirstName =
			(firstName || "").toLowerCase().split(" ")[0] || "user";
		password = `${safeFirstName}@${userCode}`;
	}
	const hashedPwd = await bcryptjs.hash(password, 10);

	let userDoc;
	try {
		userDoc = await User.create({
			...otherDetails,
			[codeField]: userCode,
			firstName,
			lastName,
			email,
			roles,
			password: hashedPwd,
			organizations: [organizationId],
			createdBy: creator.id,
			updatedBy: creator.id,
		});
	} catch (err) {
		logger.error(`Error creating user: ${err.message}`);
		return next(new ErrorResponse("Error creating user", 500));
	}

	const organization = await Organization.findById(organizationId);
	if (!organization) {
		try {
			await User.findByIdAndDelete(userDoc._id);
		} catch (cleanupErr) {
			logger.error(
				`Failed to rollback created user ${userDoc._id}: ${cleanupErr.message}`
			);
		}

		return next(new ErrorResponse("Organization not found", 404));
	}

	if (roles.includes("employee") || roles.includes("manager")) {
		if (!organization.employees.includes(userDoc._id)) {
			organization.employees.push(userDoc._id);
		}
	}

	if (roles.includes("admin")) {
		if (!organization.admins.includes(userDoc._id)) {
			organization.admins.push(userDoc._id);
		}
	}

	await organization.save();

	logger.info(
		`User ${userDoc._id} created in organization ${organizationId} by ${creator}`
	);

	res.status(201).json({
		success: true,
		data: userDoc,
		message: `User with role(s) '${roles.join(", ")}' created successfully!`,
	});
});

const getOrganizationAndUser = asyncHandler(async (req, res, next) => {
	console.log("User Info", req);
	const { organizationId } = req;
	const { id } = req.user;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return next(new ErrorResponse(`Invalid user email: ${id}`, 400));
	}

	try {
		// find users with roles admin and matching the user id and organization id
		const details = await User.findOne({
			_id: id,
			organizations: organizationId,
			roles: { $in: ["admin", "manager"] },
		})
			.populate(
				"organizations",
				"-__v -updatedAt -createdAt -customers -employees -measuringUnits -admins -brands -productTypes -productCategories -taxGroups -taxes -units -unitFamilies -attributes -products -productsCategories"
			)
			.select(
				"-password -refreshToken -mfaSecret -mfaEnabled -__v -updatedAt -createdAt -customers -employees -measuringUnits"
			);

		if (!details) {
			return next(new ErrorResponse(`User not found !`, 404));
		}

		res.status(200).json({
			success: true,
			data: details,
		});
	} catch (err) {
		logger.error(`Error fetching user ${id}: ${err.message}`);
		return next(new ErrorResponse("Error fetching user", 500));
	}
});

const userAndOrganizationValidationSchema = Joi.object({
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
		countryCode: Joi.string().required(),
		flagCode: Joi.string().max(2).required(),
		gender: Joi.string().optional().allow(""),
		phone: Joi.string()
			.pattern(/^\d{10,15}$/)
			.required(),
	}).required(),
});

const updateOrganizationAndUser = asyncHandler(async (req, res, next) => {
	const { organizationId } = req;
	const { id } = req.user;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return next(new ErrorResponse(`Invalid user ID: ${id}`, 400));
	}

	const { error } = userAndOrganizationValidationSchema.validate(req.body, {
		context: { isUpdate: true },
	});
	if (error) {
		return next(
			new ErrorResponse(`Validation Error: ${error.details[0].message}`, 400)
		);
	}

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
		active,
		storeType,
		password,
		updatedBy = id,
	} = req.body;

	console.log("Updating User ==>", req.body);

	if (password) {
		return next(new ErrorResponse("Password cannot be updated here.", 400));
	}

	user.updatedBy = id;

	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: id, organizations: organizationId },
			{ $set: user },
			{ new: true, runValidators: true }
		).select(
			"-password -refreshToken -mfaSecret -mfaEnabled -__v -updatedAt -createdAt -customers -employees -measuringUnits"
		);

		console.log("✅✅✅User Updated --->", updatedUser);

		if (!updatedUser) {
			return next(new ErrorResponse("User not found or not authorized.", 404));
		}

		const updatedOrg = await Organization.findOneAndUpdate(
			{ _id: organizationId },
			{
				$set: {
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
					active,
					storeType,
					updatedBy,
				},
			},
			{ new: true, runValidators: true }
		);

		console.log("✅✅✅Organization Updated --->", updatedOrg);

		if (!updatedOrg) {
			return next(
				new ErrorResponse("Organization not found or not authorized.", 404)
			);
		}

		logger.info(`User ${id} updated in organization ${organizationId}`);

		res.status(200).json({
			success: true,
			data: updatedUser,
			message: "User details updated successfully!",
		});
	} catch (err) {
		logger.error(`Error updating user ${err.message}`);
		return next(new ErrorResponse("Error updating user details", 500));
	}
});

// for production use
// const createNewOrganizationUser = asyncHandler(async (req, res, next) => {
// 	const organizationId = req.organizationId;
// 	const creator = req.user;

// 	if (!creator.roles.includes("admin")) {
// 		return next(
// 			new ErrorResponse(
// 				"You are not authorized to create a new user in this organization.",
// 				403
// 			)
// 		);
// 	}

// 	let body = req.body;

// 	body.honorific = "Miss";

// 	const { error } = userCreationValidationSchema.validate(req.body);
// 	if (error) {
// 		return next(
// 			new ErrorResponse(`Validation Error: ${error.details[0].message}`, 400)
// 		);
// 	}

// 	const {
// 		firstName,
// 		lastName,
// 		email,
// 		roles = ["employee"],
// 		...otherDetails
// 	} = req.body;

// 	const permittedRoles = ["admin", "manager", "employee"];
// 	const isRoleCreationAllowed = roles.every((role) =>
// 		permittedRoles.includes(role)
// 	);

// 	if (!isRoleCreationAllowed) {
// 		return next(
// 			new ErrorResponse(
// 				`You can only create users with roles: ${permittedRoles.join(", ")}.`,
// 				400
// 			)
// 		);
// 	}

// 	const session = await mongoose.startSession();
// 	try {
// 		session.startTransaction();

// 		const userExists = await User.findOne({
// 			email,
// 			organizations: organizationId,
// 		}).session(session);

// 		if (userExists) {
// 			await session.abortTransaction();
// 			session.endSession();
// 			return next(
// 				new ErrorResponse(
// 					"A user with this email already exists in this organization.",
// 					409
// 				)
// 			);
// 		}

// 		const userCode = await generateUserCode(organizationId, roles);
// 		const codeField = roles.includes("employee") ? "employeeCode" : "userCode";

// 		let { password } = req.body;
// 		if (!password) {
// 			password = `${firstName.toLowerCase().split(" ")[0]}@${userCode}`;
// 		}
// 		const hashedPwd = await bcryptjs.hash(password, 10);

// 		const [userDoc] = await User.create(
// 			[
// 				{
// 					...otherDetails,
// 					[codeField]: userCode,
// 					firstName,
// 					lastName,
// 					email,
// 					roles,
// 					password: hashedPwd,
// 					organizations: [organizationId],
// 				},
// 			],
// 			{ session }
// 		);

// 		const organization = await Organization.findById(organizationId).session(
// 			session
// 		);
// 		if (!organization) {
// 			await session.abortTransaction();
// 			session.endSession();
// 			return next(new ErrorResponse("Organization not found", 404));
// 		}

// 		if (roles.includes("employee") || roles.includes("manager")) {
// 			organization.employees.push(userDoc._id);
// 		}

// 		if (roles.includes("admin")) {
// 			organization.admins.push(userDoc._id);
// 		}

// 		await organization.save({ session });

// 		await session.commitTransaction();

// 		logger.info(
// 			`User ${userDoc._id} created in organization ${organizationId} by ${creator._id}`
// 		);

// 		res.status(201).json({
// 			success: true,
// 			data: userDoc,
// 			message: `User with role(s) '${roles.join(", ")}' created successfully!`,
// 		});
// 	} catch (err) {
// 		await session.abortTransaction();
// 		logger.error(`Error creating user: ${err.message}`);
// 		return next(new ErrorResponse("Error processing the request", 500));
// 	} finally {
// 		session.endSession();
// 	}
// });

module.exports = {
	createNewOrganizationUser,
	getOrganizationAndUser,
	updateOrganizationAndUser,
};
