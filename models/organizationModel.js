const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organizationSchema = new Schema(
	{
		legalName: {
			type: String,
			required: true,
			trim: true,
			minlength: 3,
			maxlength: 60,
		},
		registrationNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			minlength: 6,
			maxlength: 20,
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
		phone: {
			type: String,
			required: true,
			minlength: 10,
			maxlength: 15,
			validate: {
				validator: function (v) {
					return /^\d{10,15}$/.test(v); // Phone number must be digits only
				},
				message: "Invalid phone number format",
			},
		},
		address: {
			type: String,
			trim: true,
			minlength: 5,
			maxlength: 200,
		},
		city: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 20,
		},
		state: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 20,
		},
		country: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 20,
		},
		postalCode: {
			type: String,
			required: true,
			trim: true,
			minlength: 6,
			maxlength: 10,
			validate: {
				validator: function (v) {
					return /^\d+$/.test(v); // Postal code must be numeric
				},
				message: "Invalid postal code format",
			},
		},
		companySize: {
			type: String,
			required: true,
		},
		flagCode: {
			type: String,
			required: true,
			maxlength: 2, // For country flag code (e.g., 'IN')
		},
		createdAt: {
			type: Date,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Admin",
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Admin",
		},
		admins: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Admin",
			},
		],
		employees: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Employee",
			},
		],
		customers: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Customer",
			},
		],
	},
	{
		timestamps: true,
	}
);

const Organization = mongoose.model("Organization", organizationSchema);

module.exports = Organization;
