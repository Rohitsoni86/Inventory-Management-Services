const mongoose = require("mongoose");
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
		honorific: {
			type: String,
		},
		gender: {
			type: String,
			enum: Object.values(GENDER),
		},
		countryCode: {
			type: String,
			required: true,
			validate: {
				validator: function (v) {
					return /^\+?[1-9]\d{1,14}$/.test(v); // Validate international phone number format
				},
				message: "Invalid country code format",
			},
		},
		flagCode: {
			type: String,
			required: true,
			maxlength: 2,
		},
		active: {
			type: Boolean,
			default: true,
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
			default: [ROLES_LIST.Customer],
			required: true,
		},
		address: {
			type: String,
			trim: true,
			minlength: [5, "Address must be at least 5 characters long."],
			maxlength: [200, "Address cannot exceed 200 characters."],
		},
		city: {
			type: String,
			// required: [true, "City is required."],
			trim: true,
			minlength: [2, "City must be at least 2 characters long."],
			maxlength: [20, "City cannot exceed 20 characters."],
		},
		state: {
			type: String,
			// required: [true, "State is required."],
			trim: true,
			minlength: [2, "State must be at least 2 characters long."],
			maxlength: [20, "State cannot exceed 20 characters."],
		},
		country: {
			type: String,
			// required: [true, "Country is required."],
			trim: true,
			minlength: [2, "Country must be at least 2 characters long."],
			maxlength: [20, "Country cannot exceed 20 characters."],
		},
		postalCode: {
			type: String,
			// required: [true, "Postal code is required."],
			trim: true,
			minlength: [6, "Postal code must be at least 6 characters long."],
			maxlength: [10, "Postal code cannot exceed 10 characters."],
		},
		organizations: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Organizations",
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
