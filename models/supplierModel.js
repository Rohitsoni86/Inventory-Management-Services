const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const supplierSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 100,
		},
		contactPerson: {
			type: String,
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
		address: {
			type: String,
			trim: true,
			minlength: 5,
			maxlength: 200,
		},
		city: {
			type: String,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		state: {
			type: String,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		country: {
			type: String,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		postalCode: {
			type: String,
			trim: true,
			minlength: 5,
			maxlength: 10,
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true,
	}
);

const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;
