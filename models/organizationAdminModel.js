const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { ROLES_LIST, GENDER } = require("../config/otherDataConfigs");

const organizationAdminSchema = new Schema(
	{
		adminFirstName: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		adminLastName: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		adminEmail: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			validate: {
				validator: function (v) {
					return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(v);
				},
				message: "Invalid admin email format",
			},
		},
		adminCountryCode: {
			type: String,
			required: true,
			validate: {
				validator: function (v) {
					return /^\+?[1-9]\d{1,14}$/.test(v); // Validate international phone number format
				},
				message: "Invalid admin country code format",
			},
		},
		active: {
			type: Boolean,
			required: true,
		},
		adminPhone: {
			type: String,
			required: true,
			minlength: 10,
			maxlength: 15,
			validate: {
				validator: function (v) {
					return /^\d{10,15}$/.test(v); // Admin phone number must be digits only
				},
				message: "Invalid admin phone number format",
			},
		},
		credentials: {
			type: String,
			required: true,
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
		adminPassword: {
			type: String,
			required: true,
			trim: true,
		},
		adminFlagCode: {
			type: String,
			required: true,
			maxlength: 2,
		},
		roles: {
			type: [String],
			required: true,
			enum: Object.values(ROLES_LIST),
		},
		createdAt: {
			type: Date,
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true, // If you want automatic timestamps for createdAt and updatedAt
	}
);

const OrganizationAdminModel = mongoose.model("Admin", organizationAdminSchema);

module.exports = OrganizationAdminModel;
