const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const moment = require("moment");
const ErrorResponse = require("../utils/errorResponse");

// Import your models
const {
	ProductModel: Product,
} = require("../models/organizationProductsModel");
const { BatchModel } = require("../models/productBatchModel");
const { SerialModel } = require("../models/productSerialsModel");
const {
	StandardInventoryProductModel,
} = require("../models/standardProductModel");
const { InventoryLedgerModel } = require("../models/inventoryLedgerSchema");

const convertDateFormat = (dateString) => {
	if (!dateString) return null;
	const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", moment.ISO_8601];
	const m = moment(dateString, formats, true);
	return m.isValid() ? m.toDate() : null;
};

// @desc    Add Stock (Purchase / GRN)
// @route   POST /api/inventory/add-stock
// @access  Private
const addStock = asyncHandler(async (req, res, next) => {
	const {
		productId,
		quantity, // Total quantity being added
		unitCost, // Cost per item for this specific purchase
		unitPrice, // (Optional) If selling price changes with this batch
		supplier, // (Optional) Vendor name
		referenceNumber, // (Optional) PO Number or Invoice Number
		batches = [], // If batched
		serials = [], // If serialized
		expiryDate, // If standard but has expiry (rare, usually batched)
	} = req.body;

	const performedBy = req.user.id;
	const organizationId = req.organizationId;

	// 1. Fetch Product
	const product = await Product.findOne({ _id: productId, organizationId });
	if (!product) {
		return next(new ErrorResponse("Product not found", 404));
	}

	let totalQtyAdded = 0;
	let totalValueAdded = 0;
	const transactionType = "PURCHASE";
	const dateNow = new Date();

	// --- LOGIC PER PRODUCT TYPE ---

	// TYPE A: BATCHED
	if (product.trackBatches) {
		if (!batches || batches.length === 0) {
			return next(
				new ErrorResponse("Batch details are required for this product", 400)
			);
		}

		for (const batch of batches) {
			const bQty = Number(batch.batchQuantity);
			const bCost = Number(batch.batchCostPrice);

			// Create Batch
			const newBatch = await BatchModel.create({
				organizationId,
				productId,
				batchID: batch.batchID,
				expiryDate: convertDateFormat(batch.expiryDate),
				batchCostPrice: bCost,
				batchSellingPrice: batch.batchSellingPrice || product.sellPrice,
				initialQuantity: bQty,
				currentQuantity: bQty,
				isActive: true,
				entryDate: convertDateFormat(batch.entryDate) || dateNow,
				createdBy: performedBy,
			});

			// Ledger Entry (Per Batch)
			await InventoryLedgerModel.create({
				organizationId,
				productId,
				batchId: newBatch._id,
				quantityChange: bQty,
				transactionType,
				unitCost: bCost,
				referenceId: referenceNumber || "PURCHASE",
				performedBy,
			});

			totalQtyAdded += bQty;
			totalValueAdded += bQty * bCost;
		}
	}

	// TYPE B: SERIALIZED
	else if (product.trackSerials) {
		if (!serials || serials.length === 0) {
			return next(
				new ErrorResponse("Serial numbers are required for this product", 400)
			);
		}

		// Check for duplicates before inserting
		const serialsList = serials.map((s) => s.serial);
		const existing = await SerialModel.findOne({
			organizationId,
			serialNumber: { $in: serialsList },
		});

		if (existing) {
			return next(
				new ErrorResponse(
					`Serial number ${existing.serialNumber} already exists`,
					400
				)
			);
		}

		const serialDocs = serials.map((s) => ({
			organizationId,
			productId,
			serialNumber: s.serial,
			costPrice: Number(unitCost), // Cost is usually uniform for a purchase shipment
			sellPrice: Number(unitPrice || product.sellPrice),
			status: "AVAILABLE",
			currentLocation: s.locationId,
			entryDate: dateNow,
			createdBy: performedBy,
		}));

		await SerialModel.create(serialDocs);

		totalQtyAdded = serials.length;
		totalValueAdded = totalQtyAdded * Number(unitCost);

		// Ledger Entry (Summary for Serials)
		await InventoryLedgerModel.create({
			organizationId,
			productId,
			quantityChange: totalQtyAdded,
			transactionType,
			unitCost: Number(unitCost),
			referenceId: referenceNumber || "PURCHASE",
			performedBy,
		});
	}

	// TYPE C: STANDARD / VARIABLE
	else {
		// Validation
		if (!quantity || quantity <= 0) {
			return next(new ErrorResponse("Valid quantity is required", 400));
		}

		totalQtyAdded = Number(quantity);
		totalValueAdded = totalQtyAdded * Number(unitCost);

		// Update Standard Inventory Model
		// We find the existing "Bucket" for this product and increment it
		// Or create a new one if you treat every purchase as a separated row in StandardModel (Stacking)
		// assuming simpler logic: Update the main standard doc.

		let stdStock = await StandardInventoryProductModel.findOne({
			productId,
			organizationId,
		});

		if (stdStock) {
			stdStock.currentQuantity += totalQtyAdded;
			// Optionally update cost if you want the "latest" cost in this model
			stdStock.costPrice = Number(unitCost);
			await stdStock.save();
		} else {
			// Should exist from creation, but safety check:
			await StandardInventoryProductModel.create({
				organizationId,
				productId,
				costPrice: Number(unitCost),
				sellPrice: Number(unitPrice || product.sellPrice),
				initialQuantity: totalQtyAdded,
				currentQuantity: totalQtyAdded,
				createdBy: performedBy,
			});
		}

		// Ledger Entry
		await InventoryLedgerModel.create({
			organizationId,
			productId,
			quantityChange: totalQtyAdded,
			transactionType,
			unitCost: Number(unitCost),
			referenceId: referenceNumber || "PURCHASE",
			performedBy,
		});
	}

	// 2. CRITICAL: Recalculate Weighted Average Cost on Parent Product
	const currentTotalQty = product.totalQuantity || 0;
	const currentAvgCost = product.avgCostPrice || 0;

	const currentTotalValue = currentTotalQty * currentAvgCost;

	const newTotalQty = currentTotalQty + totalQtyAdded;
	const newTotalValue = currentTotalValue + totalValueAdded;

	// Avoid division by zero
	const newAvgCost = newTotalQty > 0 ? newTotalValue / newTotalQty : 0;

	// 3. Update Parent Product
	product.totalQuantity = newTotalQty;
	product.avgCostPrice = newAvgCost;

	// If user provided a new selling price, update it (Optional logic, depends on business rule)
	if (unitPrice) product.sellPrice = unitPrice;

	await product.save();

	res.status(200).json({
		success: true,
		data: {
			message: "Stock added successfully",
			newTotalQuantity: product.totalQuantity,
			newAvgCost: product.avgCostPrice,
		},
	});
});

// @desc    Get Inventory Details (Batches/Serials) for a specific Product
// @route   GET /api/inventory/details/:productId
const getInventoryDetails = asyncHandler(async (req, res, next) => {
	const { productId } = req.params;
	const organizationId = req.organizationId;

	const product = await Product.findOne({
		_id: productId,
		organizationId,
	}).lean();
	if (!product) return next(new ErrorResponse("Product not found", 404));

	let inventoryData = [];

	if (product.trackBatches) {
		// Fetch active batches (stock > 0)
		inventoryData = await BatchModel.find({
			productId,
			organizationId,
			currentQuantity: { $gt: 0 },
		}).sort({ expiryDate: 1 }); // Sort by expiry (FEFO)
	} else if (product.trackSerials) {
		// Fetch available serials
		inventoryData = await SerialModel.find({
			productId,
			organizationId,
			status: "AVAILABLE",
		}).select("serialNumber currentLocation entryDate");
	} else {
		// Standard
		inventoryData = await StandardInventoryProductModel.find({
			productId,
			organizationId,
		});
	}

	res.status(200).json({
		success: true,
		productSummary: {
			name: product.name,
			totalStock: product.totalQuantity,
			avgCost: product.avgCostPrice,
		},
		inventory: inventoryData,
	});
});

module.exports = { addStock, getInventoryDetails };
