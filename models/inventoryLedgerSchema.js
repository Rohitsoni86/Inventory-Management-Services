const mongoose = require("mongoose");
const { Schema } = mongoose;

const InventoryLedgerSchema = new Schema(
	{
		organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

		productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
		variantId: { type: Schema.Types.ObjectId, ref: "Variant" },
		batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
		serialId: { type: Schema.Types.ObjectId, ref: "Serial" },

		// HOW MUCH moved?
		quantityChange: { type: Number, required: true }, // +10 for Buy, -1 for Sell

		transactionType: {
			type: String,
			enum: [
				"OPENING_STOCK",
				"PURCHASE",
				"SALE",
				"RETURN_IN",
				"RETURN_OUT",
				"ADJUSTMENT",
				"DAMAGED",
			],
			required: true,
		},

		unitCost: { type: Number },
		unitPrice: { type: Number },
		unitTaxRate: { type: Number },

		productType: { type: String },

		// REFERENCES
		referenceId: { type: String }, // Order ID or PO Number
		performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
	},
	{ timestamps: true }
);

const InventoryLedgerModel = mongoose.model(
	"InventoryLedger",
	InventoryLedgerSchema
);

module.exports = { InventoryLedgerSchema, InventoryLedgerModel };
