const mongoose = require("mongoose");
const { Schema } = mongoose;

const validateNonNegative = (value) => {
	if (value < 0) throw new Error("Value must be greater than or equal to 0");
	return true;
};

const StandardInventoryProductSchema = new Schema(
	{
		organizationId: {
			type: Schema.Types.ObjectId,
			ref: "Organization",
			required: true,
		},

		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},

		costPrice: {
			type: Number,
			required: true,
			validate: [validateNonNegative, "Cost Price must be a positive number"],
		},
		sellPrice: {
			type: Number,
			required: true,
			validate: [validateNonNegative, "Sell Price must be a positive number"],
		},

		taxRate: { type: Number, default: 0 },

		status: {
			type: String,
			enum: ["AVAILABLE", "SOLD", "RETURNED", "DAMAGED"],
			default: "AVAILABLE",
		},

		currentLocation: {
			type: String,
			// required: true,
		},

		notes: { type: String },

		expiryDate: {
			type: Date,
			validate: {
				validator: function (value) {
					// Validate expiryDate to be in the future if it exists
					if (value && value < Date.now()) {
						return false;
					}
					return true;
				},
				message: "Expiry date must be a future date if provided.",
			},
		},

		initialQuantity: {
			type: Number,
			required: true,
			validate: [
				validateNonNegative,
				"Initial Quantity must be a positive number",
			],
		},

		currentQuantity: {
			type: Number,
			required: true,
			// validate: {
			// 	validator: function (value) {
			// 		if (value > this.initialQuantity) {
			// 			return false;
			// 		}
			// 		return true;
			// 	},
			// 	message: "Current Quantity cannot exceed Initial Quantity.",
			// },
		},

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

// Indexes for optimization
StandardInventoryProductSchema.index(
	{ productId: 1, organizationId: 1 },
	{ unique: true }
);

const StandardInventoryProductModel = mongoose.model(
	"StandardInventoryProduct",
	StandardInventoryProductSchema
);

module.exports = {
	StandardInventoryProductSchema,
	StandardInventoryProductModel,
};
