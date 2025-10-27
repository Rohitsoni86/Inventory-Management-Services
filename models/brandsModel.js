const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const brandSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			minlength: 2,
			maxlength: 50,
		},
		description: {
			type: String,
			trim: true,
			maxlength: 200,
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true,
	}
);

const Brand = mongoose.model("Brands", brandSchema);

module.exports = Brand;
