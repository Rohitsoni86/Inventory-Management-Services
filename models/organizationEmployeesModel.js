"use strict";
var mongoose = require("mongoose");
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const EmployeeUserSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		honorific: {
			type: String,
		},
		gender: {
			type: String,
			enum: Object.values(GENDER),
		},
		phoneNo: {
			type: String,
			required: [true, "phone no required."],
			trim: true,
			match: [/\d{10}/, "Please add a valid phone no"],
		},
		roles: {
			type: [String],
			enum: Object.values(ROLES_LIST),
			required: true,
		},
		mfaEnabled: {
			type: Boolean,
			default: false,
		},
		mfaSecret: {
			type: String,
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
		active: {
			type: Boolean,
			default: true,
		},
		createdAt: {
			type: Date,
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
		timestamps: true, // If you want automatic timestamps for createdAt and updatedAt
	},
	{ versionKey: false }
);

const EmployeeUserModel = mongoose.model("Employee", EmployeeUserSchema);

module.exports = EmployeeUserModel;
