const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const UserSchema = new mongoose.Schema(
	{
		employeeCode: {
			type: String,
			trim: true,
		},
		userCode: {
			type: String,
			trim: true,
		},
		honorific: {
			type: String,
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
			minlength: 0,
			maxlength: 50,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
			minlength: 0,
			maxlength: 50,
		},
		gender: {
			type: String,
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
		currentLocation: {
			type: String,
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
		refreshToken: {
			type: String,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

UserSchema.index(
	{ employeeCode: 1 },
	{
		unique: true,
		partialFilterExpression: { employeeCode: { $exists: true, $ne: null } },
	}
);

// 🔹 Unique when present
UserSchema.index(
	{ userCode: 1 },
	{
		unique: true,
		partialFilterExpression: { userCode: { $exists: true, $ne: null } },
	}
);

const UserModel = mongoose.model("User", UserSchema);

module.exports = {
	UserSchema,
	UserModel,
};
