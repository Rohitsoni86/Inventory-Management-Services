"use strict";
var mongoose = require("mongoose");
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const superAdminUserSchema = new mongoose.Schema(
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
		mfaEnabled: {
			type: Boolean,
			default: false,
		},
		mfaSecret: {
			type: String,
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
				ref: "organizations",
			},
		],
		refreshToken: String,
	},
	{ versionKey: false }
);

const superAdminUserModel = mongoose.model("AdminDB", superAdminUserSchema);

module.exports = {
	superAdminUserModel,
};
