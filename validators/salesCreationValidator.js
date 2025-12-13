const Joi = require("joi");
const mongoose = require("mongoose");

const objectIdSchema = Joi.string()
	.custom((value, helpers) => {
		if (!mongoose.Types.ObjectId.isValid(value)) {
			return helpers.error("any.invalid");
		}
		return value;
	}, "ObjectId validation")
	.required();

const saleLineSchema = Joi.object({
	productName: Joi.string().optional(), // for easier testing, not required
	productType: Joi.string().optional(), // "STANDARD" | "BATCHED" | "SERIALIZED" | etc.
	unitName: Joi.string().optional(), // for easier testing, not required
	baseQuantity: Joi.number().positive().optional(), // for easier testing, not required
	conversionFactor: Joi.number().positive().optional(), // for easier testing, not required
	unitCost: Joi.number().min(0).optional(), // for easier testing, not required
	lineSubtotal: Joi.number().min(0).optional(), // for easier testing, not required
	lineCostTotal: Joi.number().min(0).optional(), // for easier testing, not required
	taxAmount: Joi.number().min(0).optional(), // for easier testing, not required
	lineTotal: Joi.number().min(0).optional(), // for easier testing, not required
	serialNumbers: Joi.array().items(Joi.string()).optional(), // for easier testing, not required
	productId: objectIdSchema,
	unitId: objectIdSchema, // saleUnitId
	quantity: Joi.number().positive().required(),

	// For batched products
	batchId: Joi.string().optional(),

	// For serial products
	serialIds: Joi.array().items(objectIdSchema).optional(),

	// Optional overrides (discounts, manual prices) for future
	unitPrice: Joi.number().min(0).optional(),
	discountAmount: Joi.number().min(0).optional(),
	taxRate: Joi.number().min(0).max(100).optional(),
});

const createSaleSchema = Joi.object({
	invoiceNumber: Joi.string().allow("").optional(),
	invoiceDate: Joi.date().optional(),
	customer: Joi.alternatives()
		.try(
			objectIdSchema, // can pass just the customer's mongoose _id
			Joi.object({
				name: Joi.string().required(),
				phoneNo: Joi.string().required(),
				email: Joi.string().email().optional().allow(""),
				address: Joi.string().optional().allow(""),
				city: Joi.string().optional().allow(""),
				state: Joi.string().optional().allow(""),
				country: Joi.string().optional().allow(""),
				postalCode: Joi.string().optional().allow(""),
				honorific: Joi.string().optional().allow(""),
				gender: Joi.string().optional().allow(""),
				countryCode: Joi.string().optional().allow(""),
				flagCode: Joi.string().optional().allow(""),
				// customerCode: Joi.string().optional().allow(""),
				// organizations: Joi.array().items(objectIdSchema).optional(),
				// createdBy: Joi.string().optional().allow(""),
			})
		)
		.optional(),

	payment: Joi.object({
		mode: Joi.string().optional().allow(""),
		paidAmount: Joi.number().min(0).optional(),
		transactionId: Joi.string().allow("").optional(),
		paymentDate: Joi.date().allow("").optional(),
	}).optional(),

	notes: Joi.string().allow("").optional(),
	lines: Joi.array().items(saleLineSchema).min(1).required(),
	subtotal: Joi.number().min(0).optional(),
	totalTax: Joi.number().min(0).optional(),
	grandTotal: Joi.number().min(0).optional(),
});

module.exports = { createSaleSchema };
