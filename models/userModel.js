const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const UserSchema = new mongoose.Schema(
	{
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
		active: {
			type: Boolean,
			default: true,
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
		credentials: {
			type: String,
			required: false,
			trim: true,
		},
		mfaEnabled: {
			type: Boolean,
			default: false,
		},
		mfaSecret: {
			type: String,
			default: "",
		},
		password: {
			type: String,
			required: true,
			trim: true,
		},
		flagCode: {
			type: String,
			required: true,
			maxlength: 2,
		},
		roles: {
			type: [String],
			required: true,
			enum: Object.values(ROLES_LIST),
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true, // If you want automatic timestamps for createdAt and updatedAt
	}
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
