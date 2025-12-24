const mongoose = require("mongoose");
const { Schema } = mongoose;

const SalesLineSchema = new Schema(
	{
		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},

		productName: { type: String, required: true },
		productType: { type: String }, // "STANDARD" | "BATCHED" | "SERIALIZED" | etc.
		productCode: { type: String },
		sku: { type: String },

		// Units
		baseUnitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true }, // product.baseUnit
		saleUnitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },

		// Quantities
		quantity: { type: Number, required: true }, // in sale unit
		quantityBase: { type: Number, required: true }, // converted to base unit

		// Batch / serial references
		batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
		serialIds: [{ type: Schema.Types.ObjectId, ref: "Serial" }],

		// Pricing
		unitPrice: { type: Number, required: true }, // per sale unit
		grossAmount: { type: Number, required: true }, // quantity * unitPrice (before discount)
		discountAmount: { type: Number, default: 0 },
		netAmount: { type: Number, required: true }, // gross - discount

		// Tax
		taxRate: { type: Number, default: 0 }, // %
		taxAmount: { type: Number, default: 0 },

		// Final line amount (net + tax)
		lineTotal: { type: Number, required: true },

		// Cost & profit snapshot
		costPerBaseUnit: { type: Number, required: true }, // Rs per base unit at time of sale
		lineCostTotal: { type: Number, required: true }, // costPerBaseUnit * quantityBase
		lineProfit: { type: Number, required: true }, // lineTotal - lineCostTotal
	},
	{
		_id: false,
	}
);

const SalesInvoiceSchema = new Schema(
	{
		organizationId: {
			type: Schema.Types.ObjectId,
			ref: "Organization",
			required: true,
			index: true,
		},

		invoiceNumber: { type: String, required: true },
		invoiceDate: { type: Date, default: Date.now },

		customerId: {
			type: Schema.Types.ObjectId,
			ref: "Customer",
			index: true,
		},
		customerName: { type: String },
		customerCode: { type: String },

		notes: { type: String },
		payment: {
			mode: {
				type: String,
				default: "Cash",
			},
			paidAmount: { type: Number, default: 0 },
			transactionId: { type: String },
			paymentDate: { type: Date, default: Date.now },
		},
		status: {
			type: String,
			enum: ["DRAFT", "CONFIRMED", "CANCELLED"],
			default: "CONFIRMED",
		},

		lines: {
			type: [SalesLineSchema],
			validate: [(v) => v.length > 0, "At least one line is required"],
		},

		// Totals
		totalGross: { type: Number, required: true },
		totalDiscount: { type: Number, default: 0 },
		totalTax: { type: Number, required: true },
		totalAmount: { type: Number, required: true }, // grand total
		totalCost: { type: Number, required: true },
		totalProfit: { type: Number, required: true },

		createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
	},
	{ timestamps: true }
);

// Per-organization invoice number uniqueness
SalesInvoiceSchema.index(
	{ organizationId: 1, invoiceNumber: 1 },
	{ unique: true }
);

const SalesInvoiceModel = mongoose.model("SalesInvoice", SalesInvoiceSchema);

module.exports = { SalesInvoiceModel };
