const mongoose = require("mongoose");
const { Schema } = mongoose;

const BatchSchema = new Schema(
	{
		organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},

		batchID: { type: String, required: true },
		expiryDate: { type: Date },
		entryDate: { type: Date, default: Date.now },
		purchaseDate: { type: Date },

		// Financials specific to THIS batch
		batchCostPrice: { type: Number, required: true },
		batchSellingPrice: { type: Number },
		batchTaxRate: { type: Number, default: 0 },

		// Stock Logic
		initialQuantity: { type: Number, required: true }, // Bought 100
		currentQuantity: { type: Number, required: true }, // 60 remaining

		unitSales: [
			{
				unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
				price: { type: Number, default: 0 },
			},
		],

		isActive: { type: Boolean, default: true },

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

const BatchModel = mongoose.model("Batch", BatchSchema);

module.exports = { BatchSchema, BatchModel };
