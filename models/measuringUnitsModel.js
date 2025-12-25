const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const measuringUnitSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			// unique: true,
			minlength: 1,
			maxlength: 50,
		},
		shortName: {
			// 'kg','g','box12'
			type: String,
			required: true,
			trim: true,
			// unique: true,
			minlength: 1,
			maxlength: 10,
		},
		family: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "UnitFamily",
			required: true,
		},
		multiplierToBase: {
			// 1000
			type: Number,
			required: true,
			default: 1,
		},
		isBase: {
			type: Boolean,
			default: false,
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

const MeasuringUnit = mongoose.model("Unit", measuringUnitSchema);

module.exports = { measuringUnitSchema, MeasuringUnit };
