const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = (value, helpers) => {
	if (!mongoose.Types.ObjectId.isValid(value))
		return helpers.error("any.invalid");
	return value;
};

const batchSchema = Joi.object({
	batchID: Joi.string().required(),
	entryDate: Joi.string().allow(null, ""),
	expiryDate: Joi.string().allow(null, ""),
	purchaseDate: Joi.string().allow(null, ""),
	batchQuantity: Joi.number().min(0).required(),
	batchTaxRate: Joi.number().min(0).allow(null, ""),
	batchSellingPrice: Joi.number().min(0).allow(null, ""),
	batchCostPrice: Joi.number().min(0).allow(null, ""),
	quantity: Joi.number().optional(),
	productCost: Joi.string().optional().allow(""),
	productSellingPrice: Joi.string().optional().allow(""),
	productTaxRate: Joi.string().optional().allow(""),

	unitSales: Joi.array()
		.items(
			Joi.object({
				unit: Joi.string(),
				price: Joi.number().min(0).default(0),
			})
		)
		.optional(),
});

const serialSchema = Joi.object({
	serial: Joi.string().required(),
	locationId: Joi.string().optional().allow(null, ""),
	sellPrice: Joi.number().min(0).allow(null),
	costPrice: Joi.number().min(0).allow(null),
	expiryDate: Joi.string().allow(null, ""),
});

const createProductSchema = Joi.object({
	organizationId: Joi.string().required().custom(objectId),
	name: Joi.string().required(),
	sku: Joi.string().optional().allow(""),
	code: Joi.string().optional().allow(""),
	description: Joi.string().optional().allow(""),
	category: Joi.string().optional().custom(objectId),
	brand: Joi.string().optional().custom(objectId),

	productType: Joi.string().optional().allow(""),
	productTypeCode: Joi.string().optional().allow(""),
	allowBundling: Joi.bool().optional(),
	allowFractionalQty: Joi.bool().optional(),
	hasVariants: Joi.bool().optional(),
	trackInventory: Joi.bool().optional(),
	trackBatches: Joi.bool().optional(),
	trackSerials: Joi.bool().optional(),

	baseUnit: Joi.string().optional().custom(objectId),
	saleUnit: Joi.array().items(Joi.string().custom(objectId)).optional(),
	purchaseUnit: Joi.string().optional().custom(objectId),

	costPrice: Joi.number().min(0).optional(),
	sellPrice: Joi.number().min(0).optional(),
	expiryDate: Joi.string().allow(null, ""),
	stockExpiryDate: Joi.string().allow(null, ""),

	selectedAttributeKeys: Joi.array().items(Joi.string()).optional(),
	attributes: Joi.object().pattern(Joi.string(), Joi.any()).optional(),

	batches: Joi.when("trackBatches", {
		is: true,
		then: Joi.array().items(batchSchema).min(1).required(),
		otherwise: Joi.array().items(batchSchema).optional(),
	}),

	serials: Joi.when("trackSerials", {
		is: true,
		then: Joi.array().items(serialSchema).min(1).required(),
		otherwise: Joi.array().items(serialSchema).optional(),
	}),

	frontImageUrl: Joi.string().optional().allow(""),
	backImageUrl: Joi.string().optional().allow(""),

	reorderPoint: Joi.number().min(0).optional(),
	reorderQty: Joi.number().min(0).optional(),
}).unknown(true); // allow extra keys

module.exports = { createProductSchema };

// We make batches required only when trackBatches: true and serials required when trackSerials: true.

// unknown(true) permits dynamic attributes in attributes
