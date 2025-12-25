const asyncHandler = require("../middlewares/async");
const ErrorResponse = require("../utils/errorResponse");
const { SalesInvoiceModel } = require("../models/salesInvoiceModel");
const { ProductModel } = require("../models/organizationProductsModel");
const mongoose = require("mongoose");
const {
	startOfDay,
	endOfDay,
	startOfMonth,
	endOfMonth,
	startOfYear,
	endOfYear,
	parse,
} = require("date-fns");

// @desc Get Dashboard Overview Cards Data
// @route GET /api/v1/overview/cards
// @access Private
exports.getDashboardCardsData = asyncHandler(async (req, res, next) => {
	const { startDate, endDate, mode } = req.query;
	const { organizationId } = req;

	let matchConditions = {
		organizationId: new mongoose.Types.ObjectId(organizationId),
		status: "CONFIRMED",
	};

	let dateRange = {};
	if (startDate && endDate) {
		const parsedStartDate = parse(startDate, "dd-MM-yyyy", new Date());
		const parsedEndDate = parse(endDate, "dd-MM-yyyy", new Date());

		dateRange = {
			$gte: startOfDay(parsedStartDate),
			$lte: endOfDay(parsedEndDate),
		};
	} else {
		const now = new Date();
		switch (mode) {
			case "day":
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
			case "month":
				dateRange = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
				break;
			case "year":
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
			default:
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
		}
	}
	matchConditions.invoiceDate = dateRange;

	const [financialStats, totalProducts, totalCustomers] = await Promise.all([
		SalesInvoiceModel.aggregate([
			{
				$match: matchConditions,
			},
			{
				$group: {
					_id: null,
					totalSales: { $sum: "$totalAmount" },
					totalPurchase: { $sum: "$totalCost" },
					netProfit: { $sum: "$totalProfit" },
					totalTax: { $sum: "$totalTax" },
				},
			},
			{
				$project: {
					_id: 0,
					totalSales: { $round: ["$totalSales", 2] },
					totalPurchase: { $round: ["$totalPurchase", 2] },
					netProfit: { $round: ["$netProfit", 2] },
					totalTax: { $round: ["$totalTax", 2] },
				},
			},
		]),
		ProductModel.countDocuments({
			organizationId: organizationId,
		}),
		SalesInvoiceModel.distinct("customerName", {
			organizationId: organizationId,
		}),
	]);

	const stats =
		financialStats.length > 0
			? financialStats[0]
			: {
					totalSales: 0,
					totalPurchase: 0,
					netProfit: 0,
					totalTax: 0,
			  };

	res.status(200).json({
		success: true,
		data: {
			...stats,
			totalProducts,
			totalCustomers: totalCustomers.length,
		},
	});

	// output structure

	// {
	//   "success": true,
	//   "data": {
	//     "totalSales": 15000,
	//     "totalPurchase": 10000,
	//     "netProfit": 5000,
	//     "totalTax": 1500,
	//     "totalProducts": 120,
	//     "totalCustomers": 50
	//   }
	// }
});

// @desc Get Dashboard Chart Data
// @route GET /api/v1/overview/chart
// @access Private
exports.getDashboardChartData = asyncHandler(async (req, res, next) => {
	const { startDate, endDate, mode = "day" } = req.query;
	const { organizationId } = req;

	let matchConditions = {
		organizationId: new mongoose.Types.ObjectId(organizationId),
		status: "CONFIRMED",
	};

	let dateRange = {};
	if (startDate && endDate) {
		const parsedStartDate = parse(startDate, "dd-MM-yyyy", new Date());
		const parsedEndDate = parse(endDate, "dd-MM-yyyy", new Date());

		dateRange = {
			$gte: startOfDay(parsedStartDate),
			$lte: endOfDay(parsedEndDate),
		};
	} else {
		const now = new Date();
		switch (mode) {
			case "day":
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
			case "month":
				dateRange = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
				break;
			case "year":
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
			default:
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
		}
	}
	matchConditions.invoiceDate = dateRange;

	let groupFormat;
	switch (mode) {
		case "day":
			groupFormat = "%Y-%m-%d";
			break;
		case "month":
			groupFormat = "%Y-%m";
			break;

		case "year":
			groupFormat = "%Y";
			break;
		default:
			groupFormat = "%Y-%m-%d";
	}

	const aggregationResult = await SalesInvoiceModel.aggregate([
		{
			$match: matchConditions,
		},
		{
			$group: {
				_id: { $dateToString: { format: groupFormat, date: "$invoiceDate" } },
				totalSales: { $sum: "$totalAmount" },
				totalPurchase: { $sum: "$totalCost" },
				netProfit: { $sum: "$totalProfit" },
				totalTax: { $sum: "$totalTax" },
			},
		},
		{
			$project: {
				_id: 1,
				totalSales: { $round: ["$totalSales", 2] },
				totalPurchase: { $round: ["$totalPurchase", 2] },
				netProfit: { $round: ["$netProfit", 2] },
				totalTax: { $round: ["$totalTax", 2] },
			},
		},
		{
			$sort: { _id: 1 },
		},
	]);

	res.status(200).json({
		success: true,
		data: aggregationResult,
	});
});

// @desc Get Top N Categories by Sales
// @route GET /api/v1/overview/top-categories
// @access Private
exports.getTopCategories = asyncHandler(async (req, res, next) => {
	const { limit = 5 } = req.query;
	const { organizationId } = req;
	const topN = parseInt(limit, 10);

	const topCategories = await SalesInvoiceModel.aggregate([
		{
			$match: {
				organizationId: new mongoose.Types.ObjectId(organizationId),
				status: "CONFIRMED",
			},
		},
		{
			$unwind: "$lines",
		},
		{
			$lookup: {
				from: "products",
				localField: "lines.productId",
				foreignField: "_id",
				as: "productDetails",
			},
		},
		{
			$unwind: "$productDetails",
		},
		{
			$lookup: {
				from: "categories",
				localField: "productDetails.category",
				foreignField: "_id",
				as: "categoryDetails",
			},
		},
		{
			$unwind: "$categoryDetails",
		},
		{
			$group: {
				_id: {
					_id: "$categoryDetails._id",
					name: "$categoryDetails.name",
				},
				totalSales: { $sum: "$lines.lineTotal" },
			},
		},
		{
			$sort: {
				totalSales: -1,
			},
		},
		{
			$limit: topN,
		},
		{
			$group: {
				_id: null,
				categories: {
					$push: {
						categoryId: "$_id._id",
						name: "$_id.name",
						totalSales: "$totalSales",
					},
				},
				grandTotal: { $sum: "$totalSales" },
			},
		},
		{
			$unwind: "$categories",
		},
		{
			$project: {
				_id: "$categories.categoryId",
				name: "$categories.name",
				totalSales: { $round: ["$categories.totalSales", 2] },
				percentage: {
					$cond: [
						{ $eq: ["$grandTotal", 0] },
						0,
						{
							$round: [
								{
									$multiply: [
										{ $divide: ["$categories.totalSales", "$grandTotal"] },
										100,
									],
								},
								2,
							],
						},
					],
				},
			},
		},
		{
			$sort: {
				percentage: -1,
			},
		},
	]);

	if (topCategories.length === 0) {
		return res.status(200).json({
			success: true,
			data: [],
			message: "No sales data available for categories.",
		});
	}

	res.status(200).json({
		success: true,
		data: topCategories,
	});

	// output structure

	// {
	//   "success": true,
	//   "data": [
	//     {
	//       "_id": "65377f5f5e2e7c2a4c3b1e7a",
	//       "name": "Electronics",
	//       "totalSales": 1500,
	//       "percentage": 50
	//     },
	//     {
	//       "_id": "65377f5f5e2e7c2a4c3b1e7b",
	//       "name": "Books",
	//       "totalSales": 750,
	//       "percentage": 25
	//     },
	//     {
	//       "_id": "65377f5f5e2e7c2a4c3b1e7c",
	//       "name": "Home Decor",
	//       "totalSales": 750,
	//       "percentage": 25
	//     }
	//   ]
	// }
});

// @desc Get Financial Overview for multiple years
// @route GET /api/v1/overview/financial-overview
// @access Private
exports.getFinancialOverview = asyncHandler(async (req, res, next) => {
	const { years } = req.query;
	const { organizationId } = req;

	let yearList = [];
	if (years) {
		yearList = years
			.split(",")
			.map((y) => parseInt(y.trim(), 10))
			.filter((y) => !isNaN(y));
	}

	if (yearList.length === 0) {
		yearList = [new Date().getFullYear()];
	}

	const aggregationResult = await SalesInvoiceModel.aggregate([
		{
			$match: {
				organizationId: new mongoose.Types.ObjectId(organizationId),
				status: "CONFIRMED",
				$expr: {
					$in: [{ $year: "$invoiceDate" }, yearList],
				},
			},
		},
		{
			$group: {
				_id: {
					year: { $year: "$invoiceDate" },
					month: { $month: "$invoiceDate" },
				},
				totalIncome: { $sum: "$totalAmount" },
				totalExpense: { $sum: "$totalCost" },
			},
		},
		{
			$project: {
				_id: 1,
				totalIncome: { $round: ["$totalIncome", 2] },
				totalExpense: { $round: ["$totalExpense", 2] },
			},
		},
		{
			$sort: { "_id.year": 1, "_id.month": 1 },
		},
	]);

	const data = yearList
		.sort((a, b) => a - b)
		.map((year) => {
			const monthlyData = Array.from({ length: 12 }, (_, i) => {
				const month = i + 1;
				const record = aggregationResult.find(
					(item) => item._id.year === year && item._id.month === month
				);
				return {
					month,
					totalIncome: record ? record.totalIncome : 0,
					totalExpense: record ? record.totalExpense : 0,
				};
			});
			return {
				year,
				monthlyData,
			};
		});

	res.status(200).json({
		success: true,
		data,
	});

	// output structure

	// [
	//   {
	//     "year": 2023,
	//     "monthlyData": [
	//       { "month": 1, "totalIncome": 1000, "totalExpense": 500 },
	//       ...
	//     ]
	//   }
	// ]
});

// @desc Get Top N Selling Products (Filtered by Mode: day, month, year)
// @route GET /api/v1/overview/top-products
// @access Private
exports.getTopSellingProducts = asyncHandler(async (req, res, next) => {
	const { limit = 5, startDate, endDate, mode } = req.query;
	const { organizationId } = req;
	const topN = parseInt(limit, 10);

	let dateRange = {};
	if (startDate && endDate) {
		const parsedStartDate = parse(startDate, "dd-MM-yyyy", new Date());
		const parsedEndDate = parse(endDate, "dd-MM-yyyy", new Date());

		dateRange = {
			$gte: startOfDay(parsedStartDate),
			$lte: endOfDay(parsedEndDate),
		};
	} else {
		const now = new Date();
		switch (mode) {
			case "day":
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
			case "month":
				dateRange = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
				break;
			case "year":
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
			default:
				dateRange = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
				break;
		}
	}

	const topProducts = await SalesInvoiceModel.aggregate([
		{
			$match: {
				organizationId: new mongoose.Types.ObjectId(organizationId),
				status: "CONFIRMED",
				invoiceDate: dateRange,
			},
		},
		{
			$unwind: "$lines",
		},
		{
			$group: {
				_id: "$lines.productId",
				totalQuantitySold: { $sum: "$lines.quantity" },
				totalSales: { $sum: "$lines.lineTotal" },
			},
		},
		{
			$sort: {
				totalSales: -1,
			},
		},
		{
			$limit: topN,
		},
		{
			$lookup: {
				from: "products",
				localField: "_id",
				foreignField: "_id",
				as: "productDetails",
			},
		},
		{
			$unwind: "$productDetails",
		},
		{
			$project: {
				_id: 0,
				productId: "$_id",
				name: "$productDetails.name",
				sku: "$productDetails.sku",
				totalQuantitySold: "$totalQuantitySold",
				totalSales: { $round: ["$totalSales", 2] },
			},
		},
	]);

	res.status(200).json({
		success: true,
		data: topProducts,
	});

	/*
    API Response Structure:
    {
        "success": true,
        "data": [
            {
                "productId": "605c724f8d3e6c1a7c8b4567",
                "name": "Product A",
                "sku": "SKU-A",
                "totalQuantitySold": 50,
                "totalSales": 5000
            },
            {
                "productId": "605c724f8d3e6c1a7c8b4568",
                "name": "Product B",
                "sku": "SKU-B",
                "totalQuantitySold": 30,
                "totalSales": 4500
            }
        ]
    }
    */
});

// @desc Get Recent Sales
// @route GET /api/v1/overview/recent-sales
// @access Private
exports.getRecentSales = asyncHandler(async (req, res, next) => {
	let { limit = 5 } = req.query;
	const { organizationId } = req;

	limit = parseInt(limit, 10);
	if (isNaN(limit) || limit <= 0) {
		limit = 5;
	}
	if (limit > 10) {
		limit = 10;
	}

	const recentSales = await SalesInvoiceModel.aggregate([
		{
			$match: {
				organizationId: new mongoose.Types.ObjectId(organizationId),
				status: "CONFIRMED",
			},
		},
		{ $sort: { invoiceDate: -1 } },
		{ $limit: limit },
		{
			$project: {
				_id: 1,
				invoiceNumber: 1,
				customerName: 1,
				invoiceDate: 1,
				totalAmount: { $round: ["$totalAmount", 2] },
			},
		},
	]);

	res.status(200).json({
		success: true,
		data: recentSales,
	});

	/*
    API Response Structure:
    {
        "success": true,
        "data": [
            {
                "_id": "605c724f8d3e6c1a7c8b4567",
                "invoiceNumber": "INV-001",
                "customerName": "Customer A",
                "invoiceDate": "2025-12-18T10:00:00.000Z",
                "totalAmount": 150.75
            },
            {
                "_id": "605c724f8d3e6c1a7c8b4568",
                "invoiceNumber": "INV-002",
                "customerName": "Customer B",
                "invoiceDate": "2025-12-17T15:30:00.000Z",
                "totalAmount": 200.00
            }
        ]
    }
    */
});

// @desc Get Stock Alerts for products at or below reorder point
// @route GET /api/v1/overview/stock-alerts
// @access Private
exports.getStockAlerts = asyncHandler(async (req, res, next) => {
	const { page = 1, limit = 10, category, brand, productType } = req.query;
	const { organizationId } = req;

	const pageNum = parseInt(page, 10);
	const limitNum = parseInt(limit, 10);
	const startIndex = (pageNum - 1) * limitNum;

	const matchConditions = {
		organizationId: new mongoose.Types.ObjectId(organizationId),
		$expr: { $lte: ["$totalQuantity", "$reorderPoint"] },
	};

	if (category) {
		matchConditions.category = new mongoose.Types.ObjectId(category);
	}
	if (brand) {
		matchConditions.brand = new mongoose.Types.ObjectId(brand);
	}
	if (productType) {
		matchConditions.productType = productType;
	}

	const stockAlerts = await ProductModel.aggregate([
		{
			$match: matchConditions,
		},
		{
			$facet: {
				metadata: [{ $count: "total" }],
				data: [
					{ $sort: { name: 1 } },
					{ $skip: startIndex },
					{ $limit: limitNum },
					{
						$lookup: {
							from: "categories",
							localField: "category",
							foreignField: "_id",
							as: "categoryInfo",
						},
					},
					{
						$lookup: {
							from: "brands",
							localField: "brand",
							foreignField: "_id",
							as: "brandInfo",
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							sku: 1,
							totalQuantity: 1,
							reorderPoint: 1,
							category: { $arrayElemAt: ["$categoryInfo.name", 0] },
							brand: { $arrayElemAt: ["$brandInfo.name", 0] },
						},
					},
				],
			},
		},
	]);

	const data = stockAlerts[0].data;
	const total = stockAlerts[0].metadata[0]
		? stockAlerts[0].metadata[0].total
		: 0;

	const pagination = {};

	if (startIndex + data.length < total) {
		pagination.next = {
			page: pageNum + 1,
			limit: limitNum,
		};
	}

	if (startIndex > 0) {
		pagination.prev = {
			page: pageNum - 1,
			limit: limitNum,
		};
	}

	res.status(200).json({
		success: true,
		total,
		count: data.length,
		pagination,
		data,
	});

	/*
    API Response Structure:
    {
        "success": true,
        "total": 20,
        "count": 10,
        "pagination": {
            "next": {
                "page": 2,
                "limit": 10
            }
        },
        "data": [
            {
                "_id": "605c724f8d3e6c1a7c8b4567",
                "name": "Product A",
                "sku": "SKU-A",
                "totalQuantity": 5,
                "reorderPoint": 10,
                "category": "Electronics",
                "brand": "BrandX"
            },
            {
                "_id": "605c724f8d3e6c1a7c8b4568",
                "name": "Product B",
                "sku": "SKU-B",
                "totalQuantity": 8,
                "reorderPoint": 10,
                "category": "Appliances",
                "brand": "BrandY"
            }
        ]
    }
    */
});

// @desc Get Yearly Sales Analysis for multiple years
// @route GET /api/v1/overview/yearly-sales
// @access Private
exports.getYearlySalesAnalysis = asyncHandler(async (req, res, next) => {
	const { years } = req.query;
	const { organizationId } = req;

	if (!years) {
		return next(
			new ErrorResponse("Please provide years separated by comma", 400)
		);
	}

	const yearList = years
		.split(",")
		.map((y) => parseInt(y.trim(), 10))
		.filter((y) => !isNaN(y));

	if (yearList.length === 0) {
		return next(new ErrorResponse("Invalid years provided", 400));
	}

	const matchConditions = {
		organizationId: new mongoose.Types.ObjectId(organizationId),
		status: "CONFIRMED",
		$expr: {
			$in: [{ $year: "$invoiceDate" }, yearList],
		},
	};

	const aggregationResult = await SalesInvoiceModel.aggregate([
		{
			$match: matchConditions,
		},
		{
			$group: {
				_id: {
					year: { $year: "$invoiceDate" },
					month: { $month: "$invoiceDate" },
				},
				totalSales: { $sum: "$totalAmount" },
			},
		},
	]);

	const data = yearList
		.sort((a, b) => a - b)
		.map((year) => {
			const salesData = Array.from({ length: 12 }, (_, i) => {
				const month = i + 1;
				const record = aggregationResult.find(
					(item) => item._id.year === year && item._id.month === month
				);
				return {
					month,
					totalSales: record ? record.totalSales : 0,
				};
			});

			return {
				year,
				salesData,
			};
		});

	res.status(200).json({
		success: true,
		data,
	});

	// data
	/*
    API Response Structure:
    {
        "success": true,
        "data": [
            {
                "year": 2023,
                "salesData": [
                    { "month": 1, "totalSales": 1000 },
                    { "month": 2, "totalSales": 1200 },
                    // ...
                    { "month": 12, "totalSales": 1500 }
                ]
            },
            {
                "year": 2024,
                "salesData": [
                    { "month": 1, "totalSales": 1100 },
                    { "month": 2, "totalSales": 1300 },
                    // ...
                    { "month": 12, "totalSales": 1600 }
                ]
            }
        ]
    }
    */
});

// @desc Get Customer Summary (New vs Returning)
// @route GET /api/v1/overview/customer-summary
// @access Private
exports.getCustomerSummary = asyncHandler(async (req, res, next) => {
	const { startDate, endDate, mode } = req.query;
	const { organizationId } = req;

	let dateRange = {};
	if (startDate && endDate) {
		const parsedStartDate = parse(startDate, "dd-MM-yyyy", new Date());
		const parsedEndDate = parse(endDate, "dd-MM-yyyy", new Date());

		dateRange = {
			$gte: startOfDay(parsedStartDate),
			$lte: endOfDay(parsedEndDate),
		};
	} else {
		const now = new Date();
		switch (mode) {
			case "day":
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
			case "month":
				dateRange = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
				break;
			case "year":
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
			default:
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
		}
	}

	// 1. Get all unique customers who made a purchase in the selected range
	const activeCustomers = await SalesInvoiceModel.distinct("customerName", {
		organizationId: new mongoose.Types.ObjectId(organizationId),
		status: "CONFIRMED",
		invoiceDate: dateRange,
	});

	// 2. Out of these customers, find who made a purchase BEFORE the start of this range
	const returningCustomersList = await SalesInvoiceModel.distinct(
		"customerName",
		{
			organizationId: new mongoose.Types.ObjectId(organizationId),
			status: "CONFIRMED",
			invoiceDate: { $lt: dateRange.$gte },
			customerName: { $in: activeCustomers },
		}
	);

	const totalReturning = returningCustomersList.length;
	const totalNew = activeCustomers.length - totalReturning;

	res.status(200).json({
		success: true,
		data: {
			newCustomers: totalNew,
			returningCustomers: totalReturning,
			totalActiveCustomers: activeCustomers.length,
		},
	});

	// output structure

	// {
	//   "success": true,
	//   "data": {
	//     "newCustomers": 10,
	//     "returningCustomers": 25,
	//     "totalActiveCustomers": 35
	//   }
	// }
});

// @desc Get Payment Mode Summary
// @route GET /api/v1/overview/payment-modes
// @access Private
exports.getPaymentModeSummary = asyncHandler(async (req, res, next) => {
	const { startDate, endDate, mode } = req.query;
	const { organizationId } = req;

	let dateRange = {};
	if (startDate && endDate) {
		const parsedStartDate = parse(startDate, "dd-MM-yyyy", new Date());
		const parsedEndDate = parse(endDate, "dd-MM-yyyy", new Date());

		dateRange = {
			$gte: startOfDay(parsedStartDate),
			$lte: endOfDay(parsedEndDate),
		};
	} else {
		const now = new Date();
		switch (mode) {
			case "day":
				dateRange = { $gte: startOfDay(now), $lte: endOfDay(now) };
				break;
			case "month":
				dateRange = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
				break;
			case "year":
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
			default:
				dateRange = { $gte: startOfYear(now), $lte: endOfYear(now) };
				break;
		}
	}

	const paymentSummary = await SalesInvoiceModel.aggregate([
		{
			$match: {
				organizationId: new mongoose.Types.ObjectId(organizationId),
				status: "CONFIRMED",
				invoiceDate: dateRange,
			},
		},
		{
			$group: {
				_id: "$payment.mode",
				totalAmount: { $sum: "$totalAmount" },
			},
		},
		{
			$project: {
				_id: 0,
				mode: "$_id",
				totalAmount: { $round: ["$totalAmount", 2] },
			},
		},
		{
			$sort: { totalAmount: -1 },
		},
	]);

	res.status(200).json({
		success: true,
		data: paymentSummary,
	});

	// output structure

	// {
	//   "success": true,
	//   "data": [
	//     {
	//       "mode": "Cash",
	//       "totalAmount": 15000
	//     },
	//     {
	//       "mode": "Credit Card",
	//       "totalAmount": 10000
	//     },
	//     {
	//       "mode": "Bank Transfer",
	//       "totalAmount": 5000
	//     }
	//   ]
	// }
});
