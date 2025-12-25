const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// const timezonePlugin = require("./plugins/timezonePlugin");

const brandSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			// unique: true,
			minlength: 2,
			maxlength: 50,
		},
		description: {
			type: String,
			trim: true,
			maxlength: 200,
		},
		status: { type: String, enum: ["active", "inactive"], default: "active" },
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true,
	}
);

// Apply the timezone plugin
// brandSchema.plugin(timezonePlugin);

const Brand = mongoose.model("Brand", brandSchema);

module.exports = {
	brandSchema,
	Brand,
};
