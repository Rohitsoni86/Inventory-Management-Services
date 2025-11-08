const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organizationSchema = new mongoose.Schema(
	{
		legalName: {
			type: String,
			required: [true, "Legal name is required."],
			trim: true,
			minlength: [3, "Legal name must be at least 3 characters long."],
			maxlength: [60, "Legal name cannot exceed 60 characters."],
		},
		registrationNumber: {
			type: String,
			required: [true, "Registration number is required."],
			unique: true,
			trim: true,
			minlength: [6, "Registration number must be at least 6 characters long."],
			maxlength: [20, "Registration number cannot exceed 20 characters."],
		},
		email: {
			type: String,
			required: [true, "Email is required."],
			unique: true,
			lowercase: true,
			trim: true,
			validate: {
				validator: function (v) {
					return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(v);
				},
				message: "Invalid email format.",
			},
		},
		countryCode: {
			type: String,
			required: true,
			validate: {
				validator: function (v) {
					return /^\+?[1-9]\d{1,14}$/.test(v); // Validate international phone number format
				},
				message: "Invalid country code format.",
			},
		},
		phone: {
			type: String,
			required: [true, "Phone number is required."],
			minlength: 10,
			maxlength: 15,
			validate: {
				validator: function (v) {
					return /^\d{10,15}$/.test(v); // Phone number must be digits only
				},
				message: "Invalid phone number format.",
			},
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
		companySize: {
			type: String,
			required: true,
		},
		flagCode: {
			type: String,
			required: [true, "Flag code is required."],
			maxlength: [2, "Flag code cannot exceed 2 characters."], // For country flag code (e.g., 'IN')
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Admin",
		},
		admins: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
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
		measuringUnits: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Units",
			},
		],
		productsCategories: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "ProductCategories",
			},
		],
		brands: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Brands",
			},
		],
		suppliers: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Supplier",
			},
		],
		unitFamilies: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "UnitFamily",
			},
		],
		productTypes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "ProductType",
			},
		],

		defaultStore: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
);

const Organization = mongoose.model("Organization", organizationSchema);

module.exports = Organization;
