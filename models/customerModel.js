"use strict";
var mongoose = require("mongoose");
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const CustomerSchema = new mongoose.Schema(
	{
		customerCode: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			lowercase: true,
			trim: true,
		},
		// honorific: {
		// 	type: String,
		// },
		// gender: {
		// 	type: String,
		// 	enum: Object.values(GENDER),
		// },
		phoneNo: {
			type: String,
			required: [true, "phone no required."],
			trim: true,
			match: [/\d{10}/, "Please add a valid phone no"],
		},
		roles: {
			type: [String],
			enum: Object.values(ROLES_LIST),
			default: [ROLES_LIST.Customer],
			required: true,
		},
		organizations: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "organizations",
			},
		],
		refreshToken: String,
	},
	{
		timestamps: true,
	},
	{ versionKey: false }
);

const CustomerModel = mongoose.model("Customer", CustomerSchema);

module.exports = {
	CustomerModel,
	CustomerSchema,
};
