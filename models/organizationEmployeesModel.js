"use strict";
var mongoose = require("mongoose");
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const EmployeeUserSchema = new mongoose.Schema(
	{
		employeeCode: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		firstName: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		middleName: {
			type: String,
			required: false,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			validate: {
				validator: function (v) {
					return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(v);
				},
				message: "Invalid email format",
			},
		},
		honorific: {
			type: String,
		},
		gender: {
			type: String,
			enum: Object.values(GENDER),
		},
		phone: {
			type: String,
			required: true,
			minlength: 10,
			maxlength: 15,
			validate: {
				validator: function (v) {
					return /^\d{10,15}$/.test(v); // phone number must be digits only
				},
				message: "Invalid phone number format",
			},
		},
		roles: {
			type: [String],
			enum: Object.values(ROLES_LIST),
			default: [ROLES_LIST.Employee],
			required: true,
		},
		mfaEnabled: {
			type: Boolean,
			default: false,
		},
		mfaSecret: {
			type: String,
			default: "",
		},
		alternatePhoneNo: {
			type: String,
			trim: true,
			match: [/\d{10}/, "Please add a valid phone no"],
		},
		password: {
			type: String,
			required: [true, "Please add a password"],
			min: 7,
			max: 14,
		},
		flagCode: {
			type: String,
			required: false,
			maxlength: 2,
		},
		active: {
			type: Boolean,
			default: true,
		},
		createdAt: {
			type: Date,
		},
		address: {
			type: String,
			trim: true,
			minlength: [5, "Address must be at least 5 characters long."],
			maxlength: [200, "Address cannot exceed 200 characters."],
		},
		city: {
			type: String,
			required: [true, "City is required."],
			trim: true,
			minlength: [2, "City must be at least 2 characters long."],
			maxlength: [20, "City cannot exceed 20 characters."],
		},
		state: {
			type: String,
			required: [true, "State is required."],
			trim: true,
			minlength: [2, "State must be at least 2 characters long."],
			maxlength: [20, "State cannot exceed 20 characters."],
		},
		country: {
			type: String,
			required: [true, "Country is required."],
			trim: true,
			minlength: [2, "Country must be at least 2 characters long."],
			maxlength: [20, "Country cannot exceed 20 characters."],
		},
		postalCode: {
			type: String,
			required: [true, "Postal code is required."],
			trim: true,
			minlength: [6, "Postal code must be at least 6 characters long."],
			maxlength: [10, "Postal code cannot exceed 10 characters."],
		},
		currentLocation: {
			type: String,
		},
		organizations: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Organization",
			},
		],
		refreshToken: String,
	},
	{
		timestamps: true,
	},
	{ versionKey: false }
);

const EmployeeUserModel = mongoose.model("Employee", EmployeeUserSchema);

module.exports = EmployeeUserModel;
