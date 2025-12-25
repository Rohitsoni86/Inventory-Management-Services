const mongoose = require("mongoose");
const Schema = mongoose.Schema;
//  name: string;                    // 'Standard'
//   code: string;                    // 'STD'
//   description?: string;
//   trackInventory: boolean;         // true = stock tracked
//   hasVariants: boolean;            // true = multiple SKUs under same product
//   allowBundling: boolean;          // true = composed of other products
//   trackBatches: boolean;           // true = expiry/batch controlled
//   trackSerials: boolean;           // true = serial-number based tracking
//   allowFractionalQty: boolean;     // e.g. milk sold in 0.5L
//   isService: boolean;              // non-stock item
//   createdAt?: string;
//   updatedAt?: string;

const ProductTypeSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			// unique: true,
			minlength: 2,
			maxlength: 50,
		},
		code: {
			type: String,
			required: true,
			trim: true,
			// unique: true,
			minlength: 2,
			maxlength: 10,
		},
		description: {
			type: String,
			trim: true,
			maxlength: 200,
		},
		trackInventory: {
			type: Boolean,
			default: true,
		},
		hasVariants: {
			type: Boolean,
			default: false,
		},
		allowBundling: {
			type: Boolean,
			default: false,
		},
		trackBatches: {
			type: Boolean,
			default: false,
		},
		trackSerials: {
			type: Boolean,
			default: false,
		},
		allowFractionalQty: {
			type: Boolean,
			default: false,
		},
		isService: {
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

const ProductType = mongoose.model("ProductType", ProductTypeSchema);

module.exports = { ProductTypeSchema, ProductType };
