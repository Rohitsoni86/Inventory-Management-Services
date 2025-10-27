const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const measuringUnitSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			minlength: 1,
			maxlength: 50,
		},
		shortName: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			minlength: 1,
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

const MeasuringUnit = mongoose.model("Units", measuringUnitSchema);

module.exports = MeasuringUnit;
