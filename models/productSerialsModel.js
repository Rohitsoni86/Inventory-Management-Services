const mongoose = require("mongoose");
const { Schema } = mongoose;

const SerialSchema = new Schema(
	{
		organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},

		serialNumber: { type: String, required: true },

		// Costs
		costPrice: { type: Number },
		sellPrice: { type: Number },
		taxRate: { type: Number, default: 0 },
		status: {
			type: String,
			enum: ["AVAILABLE", "SOLD", "RETURNED", "DAMAGED"],
			default: "AVAILABLE",
		},

		currentLocation: { type: String },
		notes: { type: String },
		expiryDate: { type: Date },
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},

		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

const SerialModel = mongoose.model("Serial", SerialSchema);

module.exports = { SerialSchema, SerialModel };
