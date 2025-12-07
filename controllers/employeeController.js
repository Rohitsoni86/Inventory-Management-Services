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
const Joi = require("joi");
const { UserModel: User } = require("../models/userModel");
const Organization = require("../models/organizationModel");

const employeeRegValidationSchema = Joi.object({
	employeeCode: Joi.string().required(),
	honorific: Joi.string().optional(),
	firstName: Joi.string().min(2).max(50).required(),
	middleName: Joi.string().min(2).max(50).optional().allow(null, ""),
	lastName: Joi.string().min(2).max(50).required().allow(null, ""),
	email: Joi.string().email().required(),
	countryCode: Joi.string()
		.pattern(/^\+?[1-9]\d{1,14}$/)
		.optional(),
	gender: Joi.string().optional(),
	phone: Joi.string()
		.pattern(/^\d{10,15}$/)
		.required(),
	address: Joi.string().required(),
	city: Joi.string().required(),
	state: Joi.string().required(),
	country: Joi.string().required(),
	postalCode: Joi.string().required(),
});

async function generateEmployeeCode(organizationId) {
	const last = await User.findOne({
		organizations: organizationId,
	})
		.sort({ createdAt: -1 })
		.select("employeeCode")
		.lean();

	if (!last || !last.employeeCode) {
		return "EMPL-0001";
	}

	const match = last.employeeCode.match(/(\d+)$/);
	if (!match) return `${last.employeeCode}-1`;
	const nextNum = String(parseInt(match[1], 10) + 1).padStart(4, "0");
	return `EMP-${nextNum}`;
}

const createEmployee = asyncHandler(async (req, res, next) => {
	console.log("Create Employee Called", req.body);
	const organizationId = req.organizationId;
	const { user } = req;

	//check for admin role and manager role
	if (!user.roles.includes("admin") && !user.roles.includes("manager")) {
		return next(
			new ErrorResponse("You are not authorized to create an employee", 403)
		);
	}

	const {
		employeeCode = "",
		honorific,
		firstName,
		middleName,
		lastName,
		gender,
		email,
		countryCode,
		password = "",
		flagCode = "IN",
		roles = ["employee"],
		address,
		city,
		state,
		country,
		postalCode,
		currentLocation,
		organizations,
		alternatePhone,
		phone,
		active,
	} = req.body;

	// const encryptionKey = "rohit-soni-86";

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

		const { error } = employeeRegValidationSchema.validate(req.body);
		if (error) {
			return next(
				new ErrorResponse(`Validation Error: ${error.details[0].message}`, 400)
			);
		}

		// find if user already exists

		const userExists = await User.findOne({
			email,
			organizations: organizationId,
		});

		if (userExists) {
			return next(
				new ErrorResponse("User with this email already exists", 400)
			);
		}

		// generate employee code

		let employeeCode = await generateEmployeeCode(organizationId);

		// Hash password
		// create password by combining email name and employee code
		if (!password) {
			// Generate a default password if not provided
			const defaultPassword = `${firstName.toLowerCase()}@${employeeCode}`; // Example: john@123
			password = defaultPassword;
		}

		const hashedPwd = await bcryptjs.hash(password, 10);
		const createdDate = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");

		const session = await mongoose.startSession();
		session.startTransaction();

		const [userDoc] = await User.create(
			[
				{
					employeeCode,
					honorific,
					firstName,
					middleName,
					lastName,
					gender,
					email,
					countryCode,
					active,
					password: hashedPwd,
					flagCode,
					roles,
					address,
					city,
					state,
					country,
					postalCode,
					currentLocation,
					organizations,
					alternatePhone,
					phone,
				},
			],

			{ session }
		);

		// now add this user to organization employees list

		const organization = await Organization.findById(organizationId).session(
			session
		);
		if (!organization) {
			await session.abortTransaction();
			session.endSession();
			return next(new ErrorResponse("Organization not found", 404));
		}

		organization.employees.push(userDoc._id);
		await organization.save({ session });

		await session.commitTransaction();

		logger.info(
			`Employee created: ${userDoc._id} in organization: ${organizationId}`
		);

		res.status(201).json({
			success: true,
			data: userDoc,
			message: "Employee created successfully!",
		});
	} catch (err) {
		console.log("Error", err);
		logger.error(`Error creating employee: ${err.message}`);
		return next(new ErrorResponse("Error processing the request", 500));
	} finally {
		session.endSession();
	}
});

const getEmployees = asyncHandler(async (req, res, next) => {
	const { user, organizationId } = req;

	if (!user.roles.includes("admin") && !user.roles.includes("manager")) {
		return next(
			new ErrorResponse("You are not authorized to view employees", 403)
		);
	}

	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc    Get single employee by ID
// @route   GET /api/v1/employees/:id
// @access  Private
const getEmployeeById = asyncHandler(async (req, res, next) => {
	const { organizationId } = req;
	const { id } = req.params;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return next(new ErrorResponse(`Invalid employee ID: ${id}`, 400));
	}

	try {
		const employee = await User.findOne(
			{
				_id: id,
				organizations: organizationId,
				roles: { $in: ["employee", "manager"] },
			},
			{
				password: 0,
				refreshToken: 0,
				mfaSecret: 0,
				mfaEnabled: 0,
				__v: 0,
				updatedAt: 0,
				createdAt: 0,
			}
		);

		if (!employee) {
			return next(new ErrorResponse(`Employee not found !`, 404));
		}

		res.status(200).json({
			success: true,
			data: employee,
		});
	} catch (err) {
		logger.error(`Error fetching employee ${id}: ${err.message}`);
		return next(new ErrorResponse("Error fetching employee", 500));
	}
});

// @desc    Update employee
// @route   PUT /api/v1/employees/:id
// @access  Private (Admin, Employee)
const updateEmployee = asyncHandler(async (req, res, next) => {
	const { user, organizationId } = req;
	const { id } = req.params;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return next(new ErrorResponse(`Invalid employee ID: ${id}`, 400));
	}

	// Create a validation schema for updates (optional fields)
	const employeeUpdateValidationSchema = Joi.object({
		honorific: Joi.string().optional(),
		firstName: Joi.string().min(2).max(50).optional(),
		middleName: Joi.string().max(50).optional().allow(null, ""),
		lastName: Joi.string().max(50).optional().allow(null, ""),
		gender: Joi.string().optional(),
		countryCode: Joi.string()
			.pattern(/^\+?[1-9]\d{1,14}$/)
			.optional(),
		phone: Joi.string()
			.pattern(/^\d{10,15}$/)
			.optional(),
		address: Joi.string().optional(),
		city: Joi.string().optional(),
		state: Joi.string().optional(),
		country: Joi.string().optional(),
		postalCode: Joi.string().optional(),
		roles: Joi.array().items(Joi.string()).optional(),
		active: Joi.boolean().optional(),
		email: Joi.string().email().optional(),
		flagCode: Joi.string().optional(),
		currentLocation: Joi.string().optional().allow(null, ""),
		organizations: Joi.array().items(Joi.string()).optional(),
		alternatePhone: Joi.string()
			.pattern(/^\d{10,15}$/)
			.optional()
			.allow(null, ""),

		// email and employeeCode are usually not updatable
	}).min(1); // Require at least one field to be updated

	try {
		const { error } = employeeUpdateValidationSchema.validate(req.body);
		if (error) {
			return next(
				new ErrorResponse(`Validation Error: ${error.details[0].message}`, 400)
			);
		}

		let employee = await User.findOne({
			_id: id,
			organizations: organizationId,
			roles: { $in: ["employee", "manager"] },
		});

		if (!employee) {
			return next(
				new ErrorResponse(`Employee not found with id of ${id}`, 404)
			);
		}

		// Prevent email from being updated if it exists in the body
		if (req.body.email) {
			delete req.body.email;
		}

		employee = await User.findByIdAndUpdate(id, req.body, {
			new: true,
			runValidators: true,
		});

		logger.info(`Employee updated: ${employee._id}`);

		res.status(200).json({
			success: true,
			data: employee,
			message: "Employee updated successfully!",
		});
	} catch (err) {
		logger.error(`Error updating employee ${id}: ${err.message}`);
		return next(new ErrorResponse("Error updating employee", 500));
	}
});

// @desc    Delete employee
// @route   DELETE /api/v1/employees/:id
// @access  Private (Admin, Manager)
const deleteEmployee = asyncHandler(async (req, res, next) => {
	const { user, organizationId } = req;
	const { id } = req.params;

	if (!user.roles.includes("admin") && !user.roles.includes("manager")) {
		return next(
			new ErrorResponse("You are not authorized to delete an employee", 403)
		);
	}

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return next(new ErrorResponse(`Invalid employee ID: ${id}`, 400));
	}

	try {
		const employee = await User.findOne({
			_id: id,
			organizations: organizationId,
		});

		if (!employee) {
			return next(
				new ErrorResponse(`Employee not found with id of ${id}`, 404)
			);
		}

		await Organization.updateOne(
			{ _id: organizationId },
			{ $pull: { employees: employee._id } }
		);

		await User.deleteOne({ _id: id });

		logger.info(`Employee deleted: ${id} from organization: ${organizationId}`);

		res.status(200).json({
			success: true,
			data: {},
			message: "Employee deleted successfully!",
		});
	} catch (err) {
		logger.error(`Error deleting employee ${id}: ${err.message}`);
		return next(new ErrorResponse("Error deleting employee", 500));
	}
});

// @desc    Delete employee // for production only
// @route   DELETE /api/v1/employees/:id
// @access  Private (Admin, Manager)
// const deleteEmployee = asyncHandler(async (req, res, next) => {
// 	const { user, organizationId } = req;
// 	const { id } = req.params;

// 	if (!user.roles.includes("admin") && !user.roles.includes("manager")) {
// 		return next(
// 			new ErrorResponse("You are not authorized to delete an employee", 403)
// 		);
// 	}

// 	if (!mongoose.Types.ObjectId.isValid(id)) {
// 		return next(new ErrorResponse(`Invalid employee ID: ${id}`, 400));
// 	}

// 	const session = await mongoose.startSession();
// 	try {
// 		session.startTransaction();

// 		const employee = await User.findOne({
// 			_id: id,
// 			organizations: organizationId,
// 		}).session(session);

// 		if (!employee) {
// 			await session.abortTransaction();
// 			session.endSession();
// 			return next(
// 				new ErrorResponse(`Employee not found with id of ${id}`, 404)
// 			);
// 		}

// 		// Remove employee from the organization's employee list
// 		await Organization.updateOne(
// 			{ _id: organizationId },
// 			{ $pull: { employees: employee._id } },
// 			{ session }
// 		);

// 		await User.deleteOne({ _id: id }, { session });

// 		await session.commitTransaction();

// 		logger.info(`Employee deleted: ${id} from organization: ${organizationId}`);

// 		res.status(200).json({
// 			success: true,
// 			data: {},
// 			message: "Employee deleted successfully!",
// 		});
// 	} catch (err) {
// 		await session.abortTransaction();
// 		logger.error(`Error deleting employee ${id}: ${err.message}`);
// 		return next(new ErrorResponse("Error deleting employee", 500));
// 	} finally {
// 		session.endSession();
// 	}
// });

module.exports = {
	createEmployee,
	getEmployees,
	getEmployeeById,
	updateEmployee,
	deleteEmployee,
};
