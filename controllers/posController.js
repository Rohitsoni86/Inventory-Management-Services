const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const moment = require("moment");

const ErrorResponse = require("../utils/errorResponse");

const {
	ProductModel: Product,
} = require("../models/organizationProductsModel");

const { BatchModel } = require("../models/productBatchModel");
const { SerialModel } = require("../models/productSerialsModel");
const {
	StandardInventoryProductModel,
} = require("../models/standardProductModel");
const { InventoryLedgerModel } = require("../models/inventoryLedgerSchema");
const { SalesInvoiceModel } = require("../models/salesInvoiceModel");

const { MeasuringUnit } = require("../models/measuringUnitsModel");
const { createSaleSchema } = require("../validators/salesCreationValidator");
const { CustomerModel } = require("../models/customerModel");
const { convertToBaseUnit } = require("../utils/unitConversion");
const Organization = require("../models/organizationModel");

async function generateInvoiceNumber(organizationId) {
	const lastInvoice = await SalesInvoiceModel.findOne({ organizationId })
		.sort({ createdAt: -1 })
		.select("invoiceNumber")
		.lean();

	if (!lastInvoice || !lastInvoice.invoiceNumber) {
		return "INV-0001";
	}

	const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
	if (!match) return `${lastInvoice.invoiceNumber}-1`;

	const nextNum = String(parseInt(match[1], 10) + 1).padStart(4, "0");
	return lastInvoice.invoiceNumber.replace(/(\d+)$/, nextNum);
}

async function generateCustomerCode(organizationId) {
	const lastCustomer = await CustomerModel.findOne({
		organizations: organizationId,
	})
		.sort({ createdAt: -1 })
		.select("customerCode")
		.lean();

	if (!lastCustomer || !lastCustomer.customerCode) {
		return "CUST-0001";
	}

	const match = lastCustomer.customerCode.match(/(\d+)$/);
	if (!match) return `${lastCustomer.customerCode}-1`; // Fallback
	const nextNum = String(parseInt(match[1], 10) + 1).padStart(4, "0");
	return `CUST-${nextNum}`;
}

const searchPOSProducts = asyncHandler(async (req, res) => {
	const {
		search: q = "",
		limit = 10,
		category,
		brand,
		productType,
	} = req.query;
	const orgId = req.organizationId;

	if (!q && !category && !brand && !productType) {
		return res.json({ success: true, data: [] });
	}

	const query = {
		organizationId: orgId,
		active: true,
	};

	if (q) {
		const keywordRegex = new RegExp(q, "i");
		query.$or = [
			{ name: keywordRegex },
			{ sku: keywordRegex },
			{ code: keywordRegex },
		];
	}

	if (category) query.category = category;
	if (brand) query.brand = brand;
	if (productType) query.productType = productType;

	const products = await Product.find(query, {
		name: 1,
		sku: 1,
		code: 1,
		description: 1,
		category: 1,
		brand: 1,
		baseUnit: 1,
		saleUnit: 1,
		purchaseUnit: 1,
		productType: 1,
		trackBatches: 1,
		trackSerials: 1,
		sellPrice: 1,
		taxRate: 2,
		totalQuantity: 1,
		avgCostPrice: 1,
		trackInventory: 1,
		trackBatches: 1,
		trackSerials: 1,
		productAvailability: 1,
		hasExpiryDate: 1,
		frontImageUrl: 1,
		backImageUrl: 1,
		frontImagePublicId: 1,
		backImagePublicId: 1,
	})
		.populate("baseUnit", "name shortName")
		.populate("saleUnit", "name shortName")
		.populate("purchaseUnit", "name shortName")
		.populate("category", "name")
		.populate("brand", "name")

		.limit(Number(limit))
		.lean();

	console.log("Product Found ==>", products);

	const result = [];

	for (let p of products) {
		let batches = [];
		let serials = [];

		if (p.trackBatches) {
			batches = await BatchModel.find({
				productId: p._id,
				currentQuantity: { $gt: 0 },
			})
				.sort({ expiryDate: 1 })
				.limit(10)
				.lean();

			console.log("Product batches Found ==>", batches);
		}

		if (p.trackSerials) {
			serials = await SerialModel.find({
				productId: p._id,
				status: "AVAILABLE",
			})
				.limit(20)
				.lean();
		}

		// expiry info
		let soonToExpire = false;
		let expiresInDays = null;

		if (batches.length > 0) {
			const exp = batches[0].expiryDate;
			if (exp) {
				expiresInDays = moment(exp).diff(moment(), "days");
				soonToExpire = expiresInDays <= 30;
			}
		}

		result.push({
			productId: p._id,
			name: p.name,
			sku: p.sku,
			code: p.code,
			category: p.category,
			brand: p.brand,
			productType: p.productType,
			stockType: p.trackSerials
				? "SERIALIZED"
				: p.trackBatches
				? "BATCHED"
				: "STANDARD",

			units: {
				baseUnit: p.baseUnit,
				saleUnit: p.saleUnit,
				purchaseUnit: p.purchaseUnit,
			},

			pricing: {
				sellPrice: p.sellPrice || null,
				taxRate: p.taxRate || 0,
			},

			totalQuantity: p.totalQuantity,
			avgCostPrice: p.avgCostPrice,
			trackInventory: p.trackInventory,
			trackBatches: p.trackBatches,
			trackSerials: p.trackSerials,
			productAvailability: p.productAvailability,
			hasExpiryDate: p.hasExpiryDate,

			batches,
			serials,

			timeSensitivity: {
				soonToExpire,
				expiresInDays,
			},
			images: {
				frontImageUrl: p.frontImageUrl,
				backImageUrl: p.backImageUrl,
			},
		});
	}

	res.json({ success: true, data: result });
});

/**
 * POST /api/v1/organization/pos/sales
 * Body:
 * {
 *   invoiceNumber?,
 *   invoiceDate?,
 *   customerName?,
 *   notes?,
 *   lines: [
 *      {
 *        productId,
 *        unitId,        // sale unit
 *        quantity,      // in sale unit
 *        batchId?,      // for batched
 *        serialIds?     // for serialized
 *      }
 *   ]
 * }
 */

const createSale = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;
	const userId = req.user.id;

	console.log("✅ Details Passed ===>", req.body);

	if (!organizationId) {
		return next(new ErrorResponse("organizationId missing on request", 400));
	}

	// 1) Validate request
	const { error, value } = createSaleSchema.validate(req.body);
	if (error) {
		return next(new ErrorResponse(error.details[0].message, 400));
	}

	const { invoiceDate, customer: customerData, notes, payment } = value;
	let { mode, paidAmount, transactionId } = payment;
	let { invoiceNumber } = value;
	const linesReq = value.lines;

	console.log(
		"✅ Details Passed 2===>",
		invoiceNumber,
		customerData,
		notes,
		linesReq,
		payment
	);

	// REMOVED: const session = await mongoose.startSession();
	// REMOVED: session.startTransaction();

	try {
		if (!invoiceNumber || invoiceNumber.trim() === "") {
			invoiceNumber = await generateInvoiceNumber(organizationId);
		}

		// --- Customer Handling ---
		let customerDoc = null;
		if (customerData) {
			if (typeof customerData === "string") {
				// It's an ID
				customerDoc = await CustomerModel.findById(customerData);
			} else if (typeof customerData === "object") {
				// It's an object with details, find or create
				const {
					honorific,
					gender,
					name,
					countryCode,
					flagCode,
					phoneNo,
					email,
					address,
					city,
					state,
					country,
					postalCode,
				} = customerData;

				// Try to find by phone number & name
				customerDoc = await CustomerModel.findOne({
					name,
					phoneNo,
					organizations: organizationId,
				});

				if (!customerDoc) {
					// Not found, so create a new one
					const customerCode = await generateCustomerCode(organizationId);

					customerDoc = await CustomerModel.create({
						name,
						honorific,
						gender,
						countryCode,
						flagCode,
						phoneNo,
						address,
						city,
						state,
						country,
						postalCode,
						email: email || "",
						customerCode,
						organizations: [organizationId],
						createdBy: userId,
						updatedBy: userId,
					});

					// also add in the organization model new customer
					const organization = await Organization.findById(organizationId);

					organization.customers.push(customerDoc._id);
					await organization.save();
				} else {
					// Update here only name email postalcode city state and address only
					customerDoc.name = name;
					customerDoc.email = email || "";
					customerDoc.postalCode = postalCode || "";
					customerDoc.city = city || "";
					customerDoc.state = state || "";
					customerDoc.address = address || "";
					await customerDoc.save();
					console.log("Updated Details ✅✅", customerDoc);
				}
			}
		}

		const customerId = customerDoc ? customerDoc._id : null;
		const customerName = customerDoc ? customerDoc.name : "Walk-in Customer";
		const customerCode = customerDoc ? customerDoc.customerCode : null;
		// --- End Customer Handling ---

		const now = invoiceDate ? new Date(invoiceDate) : new Date();

		const salesLines = [];
		let totalGross = 0;
		let totalDiscount = 0;
		let totalTax = 0;
		let totalAmount = 0;
		let totalCost = 0;
		let totalProfit = 0;

		// 2) Process each line
		for (const line of linesReq) {
			const { productId, unitId: saleUnitId, quantity } = line;
			const batchId = line.batchId;
			const serialIds = line.serialNumbers || [];

			// 2.a) Load product
			const product = await Product.findOne({
				_id: productId,
				organizationId,
				active: true,
			}); // Removed .session(session)

			if (!product) {
				throw new ErrorResponse("Product not found or inactive", 404);
			}

			if (!product.baseUnit) {
				throw new ErrorResponse("Product baseUnit is not configured", 400);
			}

			const baseUnitId = product.baseUnit;

			// 2.b) Convert sale qty to base qty
			const quantityBase = await convertToBaseUnit(
				quantity,
				saleUnitId,
				baseUnitId
			);

			if (quantityBase <= 0) {
				throw new ErrorResponse("Calculated base quantity must be > 0", 400);
			}

			let productTypeLabel = "STANDARD";
			if (product.trackBatches) productTypeLabel = "BATCHED";
			if (product.trackSerials) productTypeLabel = "SERIALIZED";

			// 2.c) Determine cost & perform stock deductions depending on product mode
			let costPerBaseUnit = 0;
			let lineCostTotal = 0;
			let unitPrice = line.unitPrice;
			let discount = line.discountAmount || 0;
			let taxRateOverride =
				typeof line.taxRate === "number" ? line.taxRate : null;

			if (product.trackBatches) {
				// ---------------- BATCHED PRODUCT ----------------
				if (!batchId) {
					throw new ErrorResponse(
						"batchId is required for batched product",
						400
					);
				}

				const batch = await BatchModel.findOne({
					_id: batchId,
					productId: product._id,
					organizationId,
					isActive: true,
				}); // Removed .session(session)

				if (!batch) {
					throw new ErrorResponse("Batch not found or inactive", 404);
				}

				if (batch.currentQuantity < quantityBase) {
					throw new ErrorResponse("Insufficient batch stock", 400);
				}

				costPerBaseUnit = Number(batch.batchCostPrice || 0);
				lineCostTotal = costPerBaseUnit * quantityBase;

				if (typeof unitPrice !== "number") {
					const unitSale = (batch.unitSales || []).find(
						(us) => String(us.unitId) === String(saleUnitId)
					);
					if (unitSale) unitPrice = Number(unitSale.price || 0);
					else unitPrice = Number(batch.batchSellingPrice || 0);
				}

				// Deduct from batch
				batch.currentQuantity = Number(batch.currentQuantity) - quantityBase;
				if (batch.currentQuantity <= 0) {
					batch.currentQuantity = 0;
					batch.isActive = false;
				}
				await batch.save(); // Removed { session }
			} else if (product.trackSerials) {
				// ---------------- SERIALIZED PRODUCT ----------------
				if (!serialIds || !Array.isArray(serialIds) || serialIds.length === 0) {
					throw new ErrorResponse(
						"serialIds are required for serialized product",
						400
					);
				}

				if (serialIds.length !== quantity) {
					throw new ErrorResponse(
						"Quantity must match number of selected serials",
						400
					);
				}

				const serialDocs = await SerialModel.find({
					_id: { $in: serialIds },
					productId: product._id,
					organizationId,
					status: "AVAILABLE",
				}); // Removed .session(session)

				if (serialDocs.length !== serialIds.length) {
					throw new ErrorResponse(
						"Some serials are not available or do not belong to this product",
						400
					);
				}

				const totalSerialCost = serialDocs.reduce(
					(sum, s) => sum + Number(s.costPrice || 0),
					0
				);
				lineCostTotal = totalSerialCost;
				costPerBaseUnit = totalSerialCost / serialDocs.length || 0;

				if (typeof unitPrice !== "number") {
					const avgSerialPrice =
						serialDocs.reduce((sum, s) => sum + Number(s.sellPrice || 0), 0) /
							serialDocs.length || 0;
					unitPrice = Number(
						product.sellPrice != null && product.sellPrice > 0
							? product.sellPrice
							: avgSerialPrice
					);
				}

				// Mark serials as SOLD
				await SerialModel.updateMany(
					{ _id: { $in: serialIds } },
					{ $set: { status: "SOLD", updatedBy: userId } }
				); // Removed { session }
			} else if (product.trackInventory) {
				// ---------------- STANDARD INVENTORY PRODUCT ----------------
				const stdInv = await StandardInventoryProductModel.findOne({
					productId: product._id,
					organizationId,
				}); // Removed .session(session)

				if (!stdInv) {
					throw new ErrorResponse(
						"Standard inventory record not found for product",
						404
					);
				}

				if (stdInv.currentQuantity < quantityBase) {
					throw new ErrorResponse("Insufficient stock", 400);
				}

				costPerBaseUnit = Number(stdInv.costPrice || 0);
				lineCostTotal = costPerBaseUnit * quantityBase;

				if (typeof unitPrice !== "number") {
					const saleUnit = await MeasuringUnit.findById(saleUnitId); // Removed .session(session)
					if (!saleUnit) {
						throw new ErrorResponse(
							"Invalid sale unit for standard product",
							400
						);
					}
					const basePrice = Number(product.sellPrice || 0);
					unitPrice = basePrice * Number(saleUnit.multiplierToBase || 1);
				}

				// Deduct stock
				stdInv.currentQuantity = Number(stdInv.currentQuantity) - quantityBase;
				if (stdInv.currentQuantity < 0) stdInv.currentQuantity = 0;
				await stdInv.save(); // Removed { session }
			} else {
				// ---------------- NON-INVENTORY / SERVICE ----------------
				costPerBaseUnit = 0;
				lineCostTotal = 0;

				if (typeof unitPrice !== "number") {
					unitPrice = Number(product.sellPrice || 0);
				}
			}

			// 2.d) Compute pricing & tax for line
			const grossAmount = quantity * unitPrice;
			const netAmount = grossAmount - discount;

			const taxRate =
				typeof taxRateOverride === "number"
					? taxRateOverride
					: typeof product.taxRate === "number"
					? product.taxRate
					: 0;

			const taxAmount = (netAmount * taxRate) / 100;
			const lineTotal = netAmount + taxAmount;

			const lineProfit = lineTotal - lineCostTotal;

			totalGross += grossAmount;
			totalDiscount += discount;
			totalTax += taxAmount;
			totalAmount += lineTotal;
			totalCost += lineCostTotal;
			totalProfit += lineProfit;

			console.log(
				"✅ Details Passed 3===>",
				totalGross,
				totalDiscount,
				totalTax,
				totalAmount,
				totalCost,
				totalProfit
			);

			// 2.e) Update Product master quantity
			if (
				product.trackInventory ||
				product.trackBatches ||
				product.trackSerials
			) {
				product.totalQuantity =
					Number(product.totalQuantity || 0) - quantityBase;
				if (product.totalQuantity < 0) product.totalQuantity = 0;
				await product.save(); // Removed { session }
			}

			// 2.f) Create ledger rows
			if (product.trackSerials && serialIds.length > 0) {
				for (const sId of serialIds) {
					// Changed to create(obj) instead of create([arr], {session})
					let createdOne = await InventoryLedgerModel.create({
						organizationId,
						productId: product._id,
						serialId: sId,
						quantityChange: -1,
						transactionType: "SALE",
						unitCost: costPerBaseUnit,
						unitPrice,
						unitTaxRate: taxRate,
						productType: productTypeLabel,
						referenceId: invoiceNumber,
						performedBy: userId,
					});

					console.log("✅ Created Ledger Entries 1 ===>", createdOne);
				}
			} else {
				// Changed to create(obj)
				let createdOne = await InventoryLedgerModel.create({
					organizationId,
					productId: product._id,
					batchId: product.trackBatches ? batchId : undefined,
					quantityChange: -quantityBase,
					transactionType: "SALE",
					unitCost: costPerBaseUnit,
					unitPrice,
					unitTaxRate: taxRate,
					productType: productTypeLabel,
					referenceId: invoiceNumber,
					performedBy: userId,
				});
				console.log("✅ Created Ledger Entries 2 ===>", createdOne);
			}

			// 2.g) Prepare sales line snapshot
			salesLines.push({
				productId: product._id,
				productName: product.name,
				productType: productTypeLabel,
				productCode: product.code,
				sku: product.sku,
				baseUnitId,
				saleUnitId,
				quantity,
				quantityBase,
				batchId: product.trackBatches ? batchId : undefined,
				serialIds: product.trackSerials ? serialIds : [],
				unitPrice,
				grossAmount,
				discountAmount: discount,
				netAmount,
				taxRate,
				taxAmount,
				lineTotal,
				costPerBaseUnit,
				lineCostTotal,
				lineProfit,
			});
		}

		const saleDoc = await SalesInvoiceModel.create({
			organizationId,
			invoiceNumber,
			invoiceDate: now,
			customerId,
			customerName,
			customerCode,
			notes,
			payment: {
				mode,
				paidAmount,
				transactionId,
			},
			lines: salesLines,
			totalGross,
			totalDiscount,
			totalTax,
			totalAmount,
			totalCost,
			totalProfit,
			createdBy: userId,
		});

		// here we need to send all the details by populating the organization and customerId
		const populatedSaleDoc = await SalesInvoiceModel.findById(saleDoc._id)
			.populate(
				"customerId",
				"name phoneNo email address city state postalCode"
			)
			.populate(
				"organizationId",
				"legalName registrationNumber email phone address city state postalCode"
			)
			.lean();

		console.log("✅ Created Sales Doc ==>", populatedSaleDoc);

		res.status(201).json({
			success: true,
			data: populatedSaleDoc,
		});

		console.log("✅ Created Sales Doc ==>", populatedSaleDoc);
	} catch (err) {
		console.error("Error in createSale:", err);
		return next(
			err instanceof ErrorResponse
				? err
				: new ErrorResponse(err.message || "Failed to create sale", 500)
		);
	}
});

// dateFrom // dateTo // productId // customerName // invoiceNumber // minAmount / maxAmount
const listSales = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;

	const {
		page = 1,
		limit = 20,
		dateFrom,
		dateTo,
		productId,
		productName,
		customerName,
		invoiceNumber,
		minAmount,
		maxAmount,
	} = req.query;

	const query = { organizationId };

	if (dateFrom || dateTo) {
		query.invoiceDate = {};
		if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
		if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
	}

	if (invoiceNumber) query.invoiceNumber = new RegExp(invoiceNumber, "i");
	if (customerName) query.customerName = new RegExp(customerName, "i");

	if (minAmount || maxAmount) {
		query.totalAmount = {};
		if (minAmount) query.totalAmount.$gte = Number(minAmount);
		if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
	}

	// Filter by product inside invoice lines
	if (productId) {
		query["lines.productId"] = productId;
	}

	// Filter by product name inside invoice lines
	if (productName) {
		query["lines.productName"] = new RegExp(productName, "i");
	}

	const skip = (Number(page) - 1) * Number(limit);

	const result = await Promise.all([
		SalesInvoiceModel.find(query)
			.sort({ invoiceDate: -1 })
			.skip(skip)
			.limit(Number(limit))
			.populate([
				// 1. Populate items in the 'lines' array.
				// Since 'lines' is an array of subdocuments, the path 'lines.productId'
				// correctly targets the 'productId' field within each subdocument.
				// {
				// 	path: "lines.productId",
				// 	select: "name sku baseUnit saleUnit -_id", // Fields from the Product model
				// },

				// 2. Populate the Customer document.
				{
					path: "customerId",
					select: "name phoneNo email address city state postalCode -_id", // Fields from the Customer model
				},

				// 3. Populate the Organization document.
				{
					path: "organizationId",
					// Fields from the Organization model
					select:
						"legalName registrationNumber email phone address city state postalCode -_id",
				},
			]),

		SalesInvoiceModel.countDocuments(query),
	]);

	// console.log("✅✅Sales &&& Total ✅✅", result);

	const [sales, total] = result;

	res.json({
		success: true,
		data: sales,
		pagination: {
			total,
			page: Number(page),
			pages: Math.ceil(total / Number(limit)),
		},
	});
});

const getSaleInvoice = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;
	const saleId = req.params.id;

	const sale = await SalesInvoiceModel.findOne({
		_id: saleId,
		organizationId,
	})
		.populate("lines.productId", "name sku baseUnit saleUnit")
		.populate("customerId", "name phoneNo email address")
		.populate(
			"organizationId", // This line was previously the 'select' string, which Mongoose treats as the 'path' if no other path is specified, leading to an error.
			"legalName registrationNumber email phone address city state postalCode "
		)
		.lean();

	if (!sale) {
		return next(new ErrorResponse("Sale invoice not found", 404));
	}

	res.json({ success: true, data: sale });
});

const getNextInvoiceNumber = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;

	let nextInvoice = "INV-0001";

	const last = await SalesInvoiceModel.findOne({ organizationId })
		.sort({ createdAt: -1 })
		.select("invoiceNumber");

	if (last && last.invoiceNumber) {
		const match = last.invoiceNumber.match(/(\d+)$/);
		if (match) {
			const nextNum = String(parseInt(match[1]) + 1).padStart(4, "0");
			nextInvoice = last.invoiceNumber.replace(/(\d+)$/, nextNum);
		}
	}

	res.json({ success: true, data: nextInvoice });
});

const searchCustomers = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;
	const { search } = req.query; // Can be phoneNo or part of name

	if (!search) {
		return res.status(400).json({
			success: false,
			message: "Search query parameter is required.",
		});
	}

	const query = {
		organizations: organizationId,
		$or: [
			{ phoneNo: new RegExp(search, "i") }, // Case-insensitive search for phone number
			{ name: new RegExp(search, "i") }, // Case-insensitive search for name
		],
	};

	const customers = await CustomerModel.find(query)
		.select("name phoneNo email customerCode")
		.limit(10) // Limit results for performance
		.lean();

	res.json({ success: true, data: customers });
});

module.exports = {
	createSale,
	getNextInvoiceNumber,
	listSales,
	getSaleInvoice,
	searchPOSProducts,
	searchCustomers,
};

// const createSale = asyncHandler(async (req, res, next) => {
// 	const organizationId = req.organizationId;
// 	const userId = req.user.id;

// 	console.log("✅ Details Passed ===>", req.body);

// 	if (!organizationId) {
// 		return next(new ErrorResponse("organizationId missing on request", 400));
// 	}

// 	// 1) Validate request
// 	const { error, value } = createSaleSchema.validate(req.body);
// 	if (error) {
// 		return next(new ErrorResponse(error.details[0].message, 400));
// 	}

// 	const { invoiceDate, customer: customerData, notes } = value;
// 	let { invoiceNumber } = value;
// 	const linesReq = value.lines;

// 	console.log(
// 		"✅ Details Passed 2===>",
// 		invoiceNumber,
// 		customerData,
// 		notes,
// 		linesReq
// 	);

// 	const session = await mongoose.startSession();
// 	session.startTransaction();

// 	try {
// 		if (!invoiceNumber || invoiceNumber.trim() === "") {
// 			invoiceNumber = await generateInvoiceNumber(organizationId);
// 		}

// 		// --- Customer Handling ---
// 		let customerDoc = null;
// 		if (customerData) {
// 			if (typeof customerData === "string") {
// 				// It's an ID
// 				customerDoc = await CustomerModel.findById(customerData).session(
// 					session
// 				);
// 			} else if (typeof customerData === "object") {
// 				// It's an object with details, find or create
// 				const { name, phoneNo, email } = customerData;

// 				// Try to find by phone number & name
// 				customerDoc = await CustomerModel.findOne({
// 					name,
// 					phoneNo,
// 					organizations: organizationId,
// 				}).session(session);

// 				if (!customerDoc) {
// 					// Not found, so create a new one
// 					const customerCode = await generateCustomerCode(organizationId);
// 					const [newCustomer] = await CustomerModel.create(
// 						[
// 							{
// 								name,
// 								phoneNo,
// 								email: email || "",
// 								customerCode,
// 								organizations: [organizationId],
// 								createdBy: userId, // Assuming you have a user ID
// 							},
// 						],
// 						{ session }
// 					);
// 					customerDoc = newCustomer;
// 				}
// 			}
// 		}

// 		const customerId = customerDoc ? customerDoc._id : null;
// 		const customerName = customerDoc ? customerDoc.name : "Walk-in Customer";
// 		const customerCode = customerDoc ? customerDoc.customerCode : null;
// 		// --- End Customer Handling ---

// 		const now = invoiceDate ? new Date(invoiceDate) : new Date();

// 		const salesLines = [];
// 		let totalGross = 0;
// 		let totalDiscount = 0;
// 		let totalTax = 0;
// 		let totalAmount = 0;
// 		let totalCost = 0;
// 		let totalProfit = 0;

// 		// 2) Process each line
// 		for (const line of linesReq) {
// 			const { productId, unitId: saleUnitId, quantity } = line;
// 			const batchId = line.batchId;
// 			const serialIds = line.serialNumbers || [];

// 			// 2.a) Load product
// 			const product = await Product.findOne({
// 				_id: productId,
// 				organizationId,
// 				active: true,
// 			}).session(session);

// 			if (!product) {
// 				throw new ErrorResponse("Product not found or inactive", 404);
// 			}

// 			if (!product.baseUnit) {
// 				throw new ErrorResponse("Product baseUnit is not configured", 400);
// 			}

// 			const baseUnitId = product.baseUnit;

// 			// 2.b) Convert sale qty to base qty
// 			const quantityBase = await convertToBaseUnit(
// 				quantity,
// 				saleUnitId,
// 				baseUnitId
// 			);

// 			if (quantityBase <= 0) {
// 				throw new ErrorResponse("Calculated base quantity must be > 0", 400);
// 			}

// 			let productTypeLabel = "STANDARD";
// 			if (product.trackBatches) productTypeLabel = "BATCHED";
// 			if (product.trackSerials) productTypeLabel = "SERIALIZED";

// 			// 2.c) Determine cost & perform stock deductions depending on product mode
// 			let costPerBaseUnit = 0;
// 			let lineCostTotal = 0;
// 			let unitPrice = line.unitPrice; // may be provided from POS, else fallback
// 			let discount = line.discountAmount || 0;
// 			let taxRateOverride =
// 				typeof line.taxRate === "number" ? line.taxRate : null;

// 			// For Serial case, we might re-derive quantity from number of serialIds
// 			// but we assume POS ensured they match.

// 			if (product.trackBatches) {
// 				// ---------------- BATCHED PRODUCT ----------------
// 				if (!batchId) {
// 					throw new ErrorResponse(
// 						"batchId is required for batched product",
// 						400
// 					);
// 				}

// 				const batch = await BatchModel.findOne({
// 					_id: batchId,
// 					productId: product._id,
// 					organizationId,
// 					isActive: true,
// 				}).session(session);

// 				if (!batch) {
// 					throw new ErrorResponse("Batch not found or inactive", 404);
// 				}

// 				if (batch.currentQuantity < quantityBase) {
// 					throw new ErrorResponse("Insufficient batch stock", 400);
// 				}

// 				costPerBaseUnit = Number(batch.batchCostPrice || 0);
// 				lineCostTotal = costPerBaseUnit * quantityBase;

// 				// Price: if line.unitPrice not supplied, fallback to batchSellingPrice or unitSales mapping
// 				if (typeof unitPrice !== "number") {
// 					// try unitSales
// 					const unitSale = (batch.unitSales || []).find(
// 						(us) => String(us.unitId) === String(saleUnitId)
// 					);
// 					if (unitSale) unitPrice = Number(unitSale.price || 0);
// 					else unitPrice = Number(batch.batchSellingPrice || 0); // assume base unit price
// 				}

// 				// Deduct from batch
// 				batch.currentQuantity = Number(batch.currentQuantity) - quantityBase;
// 				if (batch.currentQuantity <= 0) {
// 					batch.currentQuantity = 0;
// 					batch.isActive = false;
// 				}
// 				await batch.save({ session });
// 			} else if (product.trackSerials) {
// 				// ---------------- SERIALIZED PRODUCT ----------------
// 				if (!serialIds || !Array.isArray(serialIds) || serialIds.length === 0) {
// 					throw new ErrorResponse(
// 						"serialIds are required for serialized product",
// 						400
// 					);
// 				}

// 				if (serialIds.length !== quantity) {
// 					// we could enforce this strongly
// 					throw new ErrorResponse(
// 						"Quantity must match number of selected serials",
// 						400
// 					);
// 				}

// 				const serialDocs = await SerialModel.find({
// 					_id: { $in: serialIds },
// 					productId: product._id,
// 					organizationId,
// 					status: "AVAILABLE",
// 				}).session(session);

// 				if (serialDocs.length !== serialIds.length) {
// 					throw new ErrorResponse(
// 						"Some serials are not available or do not belong to this product",
// 						400
// 					);
// 				}

// 				// costPerBaseUnit from serial costs (average)
// 				const totalSerialCost = serialDocs.reduce(
// 					(sum, s) => sum + Number(s.costPrice || 0),
// 					0
// 				);
// 				lineCostTotal = totalSerialCost;
// 				costPerBaseUnit = totalSerialCost / serialDocs.length || 0;

// 				// Unit price: use override if provided, else product.sellPrice, else average serial sellPrice
// 				if (typeof unitPrice !== "number") {
// 					const avgSerialPrice =
// 						serialDocs.reduce((sum, s) => sum + Number(s.sellPrice || 0), 0) /
// 							serialDocs.length || 0;
// 					unitPrice = Number(
// 						product.sellPrice != null && product.sellPrice > 0
// 							? product.sellPrice
// 							: avgSerialPrice
// 					);
// 				}

// 				// Mark serials as SOLD
// 				await SerialModel.updateMany(
// 					{ _id: { $in: serialIds } },
// 					{ $set: { status: "SOLD", updatedBy: userId } },
// 					{ session }
// 				);
// 			} else if (product.trackInventory) {
// 				// ---------------- STANDARD INVENTORY PRODUCT ----------------
// 				const stdInv = await StandardInventoryProductModel.findOne({
// 					productId: product._id,
// 					organizationId,
// 				}).session(session);

// 				if (!stdInv) {
// 					throw new ErrorResponse(
// 						"Standard inventory record not found for product",
// 						404
// 					);
// 				}

// 				if (stdInv.currentQuantity < quantityBase) {
// 					throw new ErrorResponse("Insufficient stock", 400);
// 				}

// 				costPerBaseUnit = Number(stdInv.costPrice || 0);
// 				lineCostTotal = costPerBaseUnit * quantityBase;

// 				if (typeof unitPrice !== "number") {
// 					// price per baseUnit -> convert to sale unit using multiplier
// 					// fetch saleUnit to apply multiplierToBase
// 					const saleUnit = await MeasuringUnit.findById(saleUnitId).session(
// 						session
// 					);
// 					if (!saleUnit) {
// 						throw new ErrorResponse(
// 							"Invalid sale unit for standard product",
// 							400
// 						);
// 					}
// 					// Example: product.sellPrice is per base unit
// 					const basePrice = Number(product.sellPrice || 0);
// 					unitPrice = basePrice * Number(saleUnit.multiplierToBase || 1);
// 				}

// 				// Deduct stock
// 				stdInv.currentQuantity = Number(stdInv.currentQuantity) - quantityBase;
// 				if (stdInv.currentQuantity < 0) stdInv.currentQuantity = 0;
// 				await stdInv.save({ session });
// 			} else {
// 				// ---------------- NON-INVENTORY / SERVICE ----------------
// 				costPerBaseUnit = 0;
// 				lineCostTotal = 0;

// 				if (typeof unitPrice !== "number") {
// 					unitPrice = Number(product.sellPrice || 0);
// 				}
// 			}

// 			// 2.d) Compute pricing & tax for line
// 			const grossAmount = quantity * unitPrice;
// 			const netAmount = grossAmount - discount;

// 			const taxRate =
// 				typeof taxRateOverride === "number"
// 					? taxRateOverride
// 					: typeof product.taxRate === "number"
// 					? product.taxRate
// 					: 0;

// 			const taxAmount = (netAmount * taxRate) / 100;
// 			const lineTotal = netAmount + taxAmount;

// 			const lineProfit = lineTotal - lineCostTotal;

// 			totalGross += grossAmount;
// 			totalDiscount += discount;
// 			totalTax += taxAmount;
// 			totalAmount += lineTotal;
// 			totalCost += lineCostTotal;
// 			totalProfit += lineProfit;

// 			console.log(
// 				"✅ Details Passed 3===>",
// 				totalGross,
// 				totalDiscount,
// 				totalTax,
// 				totalAmount,
// 				totalCost,
// 				totalProfit
// 			);

// 			// 2.e) Update Product master quantity & avgCostPrice (sales do not change avgCost normally)
// 			if (
// 				product.trackInventory ||
// 				product.trackBatches ||
// 				product.trackSerials
// 			) {
// 				product.totalQuantity =
// 					Number(product.totalQuantity || 0) - quantityBase;
// 				if (product.totalQuantity < 0) product.totalQuantity = 0;
// 				await product.save({ session });
// 			}

// 			// 2.f) Create ledger rows
// 			if (product.trackSerials && serialIds.length > 0) {
// 				// one ledger per serial
// 				for (const sId of serialIds) {
// 					let createdOnes = await InventoryLedgerModel.create(
// 						[
// 							{
// 								organizationId,
// 								productId: product._id,
// 								serialId: sId,
// 								quantityChange: -1, // one piece per serial, base unit assumed as piece
// 								transactionType: "SALE",
// 								unitCost: costPerBaseUnit,
// 								unitPrice,
// 								unitTaxRate: taxRate,
// 								productType: productTypeLabel,
// 								referenceId: invoiceNumber,
// 								performedBy: userId,
// 							},
// 						],
// 						{ session }
// 					);

// 					console.log("✅ Created Ledger Entries 1 ===>", createdOnes);
// 				}
// 			} else {
// 				// one ledger per line
// 				let createdOnes = await InventoryLedgerModel.create(
// 					[
// 						{
// 							organizationId,
// 							productId: product._id,
// 							batchId: product.trackBatches ? batchId : undefined,
// 							quantityChange: -quantityBase,
// 							transactionType: "SALE",
// 							unitCost: costPerBaseUnit,
// 							unitPrice,
// 							unitTaxRate: taxRate,
// 							productType: productTypeLabel,
// 							referenceId: invoiceNumber,
// 							performedBy: userId,
// 						},
// 					],
// 					{ session }
// 				);
// 				console.log("✅ Created Ledger Entries 2 ===>", createdOnes);
// 			}

// 			// 2.g) Prepare sales line snapshot

// 			console.log("Sales Line Pushed ==>", {
// 				productId: product._id,
// 				productName: product.name,
// 				productType: productTypeLabel,
// 				baseUnitId,
// 				saleUnitId,
// 				quantity,
// 				quantityBase,
// 				batchId: product.trackBatches ? batchId : undefined,
// 				serialIds: product.trackSerials ? serialIds : [],
// 				unitPrice,
// 				grossAmount,
// 				discountAmount: discount,
// 				netAmount,
// 				taxRate,
// 				taxAmount,
// 				lineTotal,
// 				costPerBaseUnit,
// 				lineCostTotal,
// 				lineProfit,
// 			});
// 			salesLines.push({
// 				productId: product._id,
// 				productName: product.name,
// 				productType: productTypeLabel,
// 				baseUnitId,
// 				saleUnitId,
// 				quantity,
// 				quantityBase,
// 				batchId: product.trackBatches ? batchId : undefined,
// 				serialIds: product.trackSerials ? serialIds : [],
// 				unitPrice,
// 				grossAmount,
// 				discountAmount: discount,
// 				netAmount,
// 				taxRate,
// 				taxAmount,
// 				lineTotal,
// 				costPerBaseUnit,
// 				lineCostTotal,
// 				lineProfit,
// 			});
// 		}

// 		// 3) Create SalesInvoice document
// 		const saleDoc = await SalesInvoiceModel.create(
// 			[
// 				{
// 					organizationId,
// 					invoiceNumber,
// 					invoiceDate: now,
// 					customerName,
// 					notes,
// 					lines: salesLines,
// 					totalGross,
// 					totalDiscount,
// 					totalTax,
// 					totalAmount,
// 					totalCost,
// 					totalProfit,
// 					createdBy: userId,
// 				},
// 			],
// 			{ session }
// 		);

// 		console.log("✅ Created Sales Doc ==>", saleDoc);

// 		await session.commitTransaction();
// 		session.endSession();

// 		res.status(201).json({
// 			success: true,
// 			data: saleDoc[0],
// 		});
// 	} catch (err) {
// 		await session.abortTransaction();
// 		session.endSession();
// 		console.error("Error in createSale:", err);
// 		return next(
// 			err instanceof ErrorResponse
// 				? err
// 				: new ErrorResponse(err.message || "Failed to create sale", 500)
// 		);
// 	}
// });

// search product give like this

// {
//   "success": true,
//   "data": [
//     {
//       "productId": "6454abc9e91d1",
//       "productType": "BATCHED",
//       "name": "Engine Oil 1L",
//       "sku": "ENG001",
//       "code": "EN-OIL",
//       "brand": "Castrol",
//       "category": "Lubricants",

//       "units": {
//         "baseUnit": { "_id": "unit_l", "name": "Litre" },
//         "saleUnit": [
//           { "_id": "unit_l", "name": "Litre" },
//           { "_id": "unit_ml", "name": "ml" }
//         ],
//         "purchaseUnit": { "_id": "unit_l", "name": "Litre" }
//       },

//       "pricing": {
//         "sellPrice": 450,
//         "taxRate": 18
//       },

//       "stockType": "BATCHED",

//       "batches": [
//         {
//           "batchId": "B1",
//           "_id": "66hh7gs91",
//           "batchCostPrice": 300,
//           "batchSellingPrice": 450,
//           "expiryDate": "2025-09-01",
//           "currentQuantity": 20,
//           "unitSales": [
//             { "unitId": "unit_l", "price": 450 },
//             { "unitId": "unit_ml", "price": 0.45 }
//           ]
//         }
//       ],

//       "serials": [],

//       "timeSensitivity": {
//         "soonToExpire": true,
//         "expiresInDays": 30
//       }
//     }
//   ]
// }
