const asyncHandler = require("express-async-handler");
const {
	ProductModel: Product,
} = require("../models/organizationProductsModel");
const moment = require("moment");
const { createProductSchema } = require("../validators/productValidators");
const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");
const { ProductType } = require("../models/productType");
const { BatchModel } = require("../models/productBatchModel");
const { InventoryLedgerModel } = require("../models/inventoryLedgerSchema");
const { SerialModel } = require("../models/productSerialsModel");
const {
	StandardInventoryProductModel,
} = require("../models/standardProductModel");

const convertDateFormat = (dateString) => {
	if (!dateString) return null;

	// An array of formats to try. Moment.js will try them in order.
	const formats = [
		"YYYY-MM-DD", // For '2026-11-30'
		"DD/MM/YYYY", // For '30/11/2026'
		"DD-MM-YYYY", // For '30-11-2026'
		"YYYY/MM/DD",
		moment.ISO_8601, // For ISO format like '2026-11-30T00:00:00.000Z'
	];

	const m = moment(dateString, formats, true); // 'true' for strict parsing
	return m.isValid() ? m.toDate() : null;
};

const processOpeningStock = async (product, payload) => {
	const {
		openingStockQty = 0,
		openingStockCost = 0,
		batches = [],
		serials = [],
		createdBy,
		openingStockQuantity = 0,
	} = payload;

	let totalQtyToAdd = 0;
	let totalValueToAdd = 0;
	const transactionType = "OPENING_STOCK";

	// CASE A: BATCHED PRODUCT
	if (product.trackBatches) {
		if (!batches || batches.length === 0) return;

		for (const batchData of batches) {
			const qty = Number(batchData.batchQuantity);
			const cost = Number(batchData.batchCostPrice);

			// Create Batch Document (no session)
			const [batchDoc] = await BatchModel.create([
				{
					organizationId: product.organizationId,
					productId: product._id,
					batchID: batchData.batchID,
					expiryDate: batchData.expiryDate
						? convertDateFormat(batchData.expiryDate)
						: null,
					batchCostPrice: cost,
					batchSellingPrice: batchData.batchSellingPrice,
					batchTaxRate: batchData.batchTaxRate,
					initialQuantity: qty,
					currentQuantity: qty,
					isActive: true,
					entryDate: batchData.entryDate
						? convertDateFormat(batchData.entryDate)
						: null,
					purchaseDate: batchData.purchaseDate
						? convertDateFormat(batchData.purchaseDate)
						: null,
					createdBy: createdBy,
				},
			]);

			// Ledger Entry (no session)
			await InventoryLedgerModel.create([
				{
					organizationId: product.organizationId,
					productId: product._id,
					batchId: batchDoc._id,
					quantityChange: qty,
					transactionType,
					unitCost: cost,
					referenceId: "OPENING_STOCK",
					productType: product.productType || "BATCHED",
					performedBy: createdBy,
				},
			]);

			totalQtyToAdd += qty;
			totalValueToAdd += qty * cost;
		}
	}

	// CASE B: SERIALIZED PRODUCT
	else if (product.trackSerials) {
		if (!serials || serials.length === 0) return;

		const serialDocs = serials.map((s) => ({
			organizationId: product.organizationId,
			productId: product._id,
			serialNumber: s.serial,
			costPrice: Number(s.costPrice || openingStockCost), // Fallback to general cost
			sellPrice: Number(s.sellPrice),
			taxRate: Number(s.taxRate),
			status: "AVAILABLE",
			currentLocation: s.locationId,
			createdBy: createdBy,
			expiryDate: s.expiryDate ? convertDateFormat(s.expiryDate) : null,
		}));

		await SerialModel.create(serialDocs);

		totalQtyToAdd = serials.length;
		totalValueToAdd = serials.reduce(
			(sum, s) => sum + Number(s.costPrice || openingStockCost),
			0
		);

		// Ledger Entry (no session)
		await InventoryLedgerModel.create([
			{
				organizationId: product.organizationId,
				productId: product._id,
				quantityChange: totalQtyToAdd,
				transactionType,
				unitCost: Number(totalValueToAdd),
				referenceId: "OPENING_STOCK",
				productType: product.productType || "SERIALIZED",
				performedBy: createdBy,
			},
		]);
	} else if (product.trackInventory) {
		if (!openingStockQuantity || openingStockQuantity <= 0) return;

		console.log("Creating Standard Product ====> 🧨", product);
		const standardProductDoc = await StandardInventoryProductModel.create({
			organizationId: product.organizationId,
			productId: product._id,
			costPrice: Number(openingStockCost),
			sellPrice: Number(product.sellPrice || 0),
			initialQuantity: Number(openingStockQuantity),
			currentQuantity: Number(openingStockQuantity),
			taxRate: Number(product.taxRate || 0),
			createdBy: createdBy,
			expiryDate: product.expiryDate
				? convertDateFormat(product.expiryDate)
				: null,
		});

		console.log("Standard Product Created ====> 🧨", standardProductDoc);

		totalQtyToAdd = Number(openingStockQuantity);
		totalValueToAdd = totalQtyToAdd * Number(openingStockCost);

		await InventoryLedgerModel.create({
			organizationId: product.organizationId,
			productId: product._id,
			quantityChange: totalQtyToAdd,
			transactionType,
			unitCost: Number(openingStockCost),
			referenceId: "OPENING_STOCK",
			productType: product.productType || "STANDARD",
			performedBy: createdBy,
		});
	}

	// CASE C: OTHER STANDARD / VARIABLE PRODUCT
	else {
		if (openingStockQty > 0) {
			totalQtyToAdd = Number(openingStockQty);
			totalValueToAdd = totalQtyToAdd * Number(openingStockCost);

			// Ledger Entry (no session)
			await InventoryLedgerModel.create([
				{
					organizationId: product.organizationId,
					productId: product._id,
					quantityChange: totalQtyToAdd,
					transactionType,
					unitCost: Number(openingStockCost),
					referenceId: "OPENING_STOCK",
					productType: product.productType || "OTHER STANDARD/VARIABLE",
					performedBy: createdBy,
				},
			]);
		}
	}

	// UPDATE PRODUCT MASTER
	if (totalQtyToAdd > 0) {
		product.totalQuantity = totalQtyToAdd;
		product.avgCostPrice = totalValueToAdd / totalQtyToAdd;
		await product.save();
	}
};

const createProduct = asyncHandler(async (req, res, next) => {
	try {
		const handler = req.user.id;
		const organizationId = req.organizationId;
		let payload = { ...req.body, organizationId };

		const { error, value } = createProductSchema.validate(payload);
		if (error) throw new ErrorResponse(error.details[0].message, 400);

		console.log("Valuess used ==>", value);

		value.createdBy = handler;

		// Apply Defaults from Product Type
		if (value.productType) {
			const pt = await ProductType.findOne({
				$or: [{ key: value.productType }, { name: value.productType }],
			});
			if (pt && pt.defaults) {
				value.trackBatches = value.trackBatches ?? pt.defaults.trackBatches;
				value.trackSerials = value.trackSerials ?? pt.defaults.trackSerials;
				value.trackInventory =
					value.trackInventory ?? pt.defaults.trackInventory;
			}
		}

		// Prepare Product Data
		const productData = { ...value };
		delete productData.batches;
		delete productData.serials;
		delete productData.openingStockQty;

		// Initialize
		productData.totalQuantity = 0;
		productData.avgCostPrice = 0;

		// date
		if (value.expiryDate) {
			productData.expiryDate = convertDateFormat(value.expiryDate);
		}

		// Create the Product Blueprint
		const product = new Product(productData);
		await product.save();

		console.log("Product Created ==>", product);

		// Handle Opening Stock
		await processOpeningStock(product, value);

		res.status(201).json({ success: true, data: product });
	} catch (err) {
		if (err.code === 11000) {
			const field = Object.keys(err.keyValue || {})[0];
			return next(new ErrorResponse(`Product already exists`, 400));
		}
		return next(
			err instanceof ErrorResponse ? err : new ErrorResponse(err.message, 500)
		);
	}
});

const getProduct = asyncHandler(async (req, res, next) => {
	const { id } = req.params;
	if (!mongoose.Types.ObjectId.isValid(id))
		return next(new ErrorResponse("Invalid product id", 400));
	const product = await Product.findById(id)
		.select([
			"name",
			"sku",
			"code",
			"description",
			"code",
			"category",
			"productType",
			"purchaseUnit",
			"saleUnit",
			"brand",
			"baseUnit",
			"reorderPoint",
			"reorderQty",
			"frontImageUrl",
			"backImageUrl",
			"frontImageType",
			"backImageType",
			"productAvailability",
			"hasExpiryDate",
			"selectedAttributeKeys",
			"attributes",
			"trackInventory",
		])
		// .populate("category")
		// .populate("brand")
		// .populate("baseUnit")
		// .populate("saleUnit")
		// .populate("purchaseUnit")
		.lean();
	if (!product) return next(new ErrorResponse("Product not found", 404));
	res.json({ success: true, data: product });
});

const listProducts = asyncHandler(async (req, res, next) => {
	const { page = 1, limit = 25, search = "" } = req.query;
	const organizationId = req.organizationId;
	const q = { organizationId };
	if (search) {
		q.$or = [
			{ name: { $regex: search, $options: "i" } },
			{ sku: { $regex: search, $options: "i" } },
			{ code: { $regex: search, $options: "i" } },
		];
	}
	const skip = (Number(page) - 1) * Number(limit);
	const [total, data] = await Promise.all([
		Product.countDocuments(q),
		Product.find(q)
			.skip(skip)
			.limit(Number(limit))
			.sort({ createdAt: -1 })
			.populate("category", "name")
			.populate("brand", "name")
			.populate("baseUnit", "name shortName")
			.populate("saleUnit", "name shortName")
			.populate("purchaseUnit", "name shortName")
			.lean(),
	]);
	res.json({ success: true, data, total });
});

const updateProduct = asyncHandler(async (req, res, next) => {
	const { id } = req.params;
	if (!mongoose.Types.ObjectId.isValid(id))
		return next(new ErrorResponse("Invalid product id", 400));
	const payload = req.body;

	console.log("Received Values ==>", payload);

	// If productType changed, you might want to merge defaults (similar to create)
	if (payload.productType) {
		const pt = await ProductType.findOne({
			$or: [{ key: payload.productType }, { name: payload.productType }],
		});
		if (pt && pt.defaults) {
			payload.allowBundling =
				payload.allowBundling !== undefined
					? payload.allowBundling
					: pt.defaults.allowBundling;
			payload.allowFractionalQty =
				payload.allowFractionalQty !== undefined
					? payload.allowFractionalQty
					: pt.defaults.allowFractionalQty;
			payload.hasVariants =
				payload.hasVariants !== undefined
					? payload.hasVariants
					: pt.defaults.hasVariants;
			payload.trackInventory =
				payload.trackInventory !== undefined
					? payload.trackInventory
					: pt.defaults.trackInventory;
			payload.trackBatches =
				payload.trackBatches !== undefined
					? payload.trackBatches
					: pt.defaults.trackBatches;
			payload.trackSerials =
				payload.trackSerials !== undefined
					? payload.trackSerials
					: pt.defaults.trackSerials;
			payload.productTypeCode = pt.code || payload.productTypeCode;
		}
	}

	if (
		req.body.totalQuantity ||
		req.body.currentStock ||
		req.body.batches ||
		req.body.serials
	) {
		delete req.body.totalQuantity;
		delete req.body.currentStock;
		delete req.body.avgCostPrice;
		delete req.body.batches;
		delete req.body.serials;
	}

	try {
		// allow to edit only specific fields
		const allowedUpdates = [
			"name",
			"sku",
			"code",
			"description",
			"category",
			"brand",
			"baseUnit",
			"saleUnit",
			"purchaseUnit",
			"hasExpiryDate",
			"productType",
			"allowBundling",
			"allowFractionalQty",
			"hasVariants",
			"trackInventory",
			"trackBatches",
			"trackSerials",
			"productAvailability",
			"reorderPoint",
			"reorderQty",
			"selectedAttributeKeys",
			"attributes",
			"frontImageUrl",
			"backImageUrl",
			"frontImageType",
			"backImageType",
			"active",
		];
		let updates = {};
		for (const key of allowedUpdates) {
			if (payload[key] !== undefined) {
				updates[key] = payload[key];
			}
		}

		if (Object.keys(updates).length === 0) {
			return next(new ErrorResponse("No valid fields to update", 400));
		}

		console.log("Updating Values ==>", updates);

		const updated = await Product.findByIdAndUpdate(
			id,
			{ $set: updates },
			{ new: true, runValidators: true }
		);

		console.log("Updated Values ==>", updated);
		if (!updated) return next(new ErrorResponse("Product not found", 404));
		res.json({ success: true, data: updated });
	} catch (err) {
		if (err.code === 11000) {
			const field = Object.keys(err.keyValue || {})[0];
			return next(
				new ErrorResponse(`${field} already exists for this organization`, 400)
			);
		}
		return next(
			new ErrorResponse(err.message || "Error updating product", 500)
		);
	}
});

const deleteProduct = asyncHandler(async (req, res, next) => {
	const { id } = req.params;
	if (!mongoose.Types.ObjectId.isValid(id))
		return next(new ErrorResponse("Invalid product id", 400));
	const deleted = await Product.findByIdAndDelete(id);
	if (!deleted) return next(new ErrorResponse("Product not found", 404));
	res.json({ success: true, message: "Product deleted" });
});

module.exports = {
	createProduct,
	getProduct,
	listProducts,
	updateProduct,
	deleteProduct,
};
