const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { Tax } = require("../models/taxModel");
const Organization = require("../models/organizationModel");
const { default: mongoose } = require("mongoose");

// @desc Create a new tax
// @route POST /api/admin/create/tax
// @access Private (Admin)
const createTax = asyncHandler(async (req, res, next) => {
	const { name, rate, effectiveFrom, description } = req.body;
	const organizationId = req.organizationId;

	if (!name || rate === undefined || !effectiveFrom) {
		return next(
			new ErrorResponse("Tax name, rate, and effective date are required", 400)
		);
	}

	const taxExists = await Tax.findOne({ name, organizations: organizationId });
	if (taxExists) {
		return next(new ErrorResponse("Tax with this name already exists", 400));
	}

	try {
		const tax = await Tax.create({
			name,
			rate,
			effectiveFrom,
			description,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.taxes.push(tax._id);
		await organization.save();

		res.status(201).json({
			success: true,
			data: tax,
			message: "Tax created successfully",
		});
	} catch (error) {
		console.log("Error In creating tax ==>", error);
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all taxes
// @route GET /api/admin/get/taxes
// @access Private (Admin)
const getTaxes = asyncHandler(async (req, res, next) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single tax by ID
// @route GET /api/admin/get/tax/:id
// @access Private (Admin)
const getTaxById = asyncHandler(async (req, res, next) => {
	try {
		const tax = await Tax.findById(req.params.id);

		if (!tax) {
			return next(
				new ErrorResponse(`Tax not found with id of ${req.params.id}`, 404)
			);
		}

		res.status(200).json({
			success: true,
			data: tax,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a tax
// @route PUT /api/admin/update/tax/:id
// @access Private (Admin)
const updateTax = asyncHandler(async (req, res, next) => {
	const { name, rate, type, effectiveFrom, description, status } = req.body;

	try {
		// Build tax object
		const taxFields = {};
		if (name) taxFields.name = name;
		if (rate !== undefined) taxFields.rate = rate;
		if (effectiveFrom) taxFields.effectiveFrom = effectiveFrom;
		if (description) taxFields.description = description;
		if (status) taxFields.status = status;
		taxFields.updatedBy = req.user.id;

		let tax = await Tax.findById(req.params.id);

		if (!tax) {
			return next(
				new ErrorResponse(`Tax not found with id of ${req.params.id}`, 404)
			);
		}

		tax = await Tax.findByIdAndUpdate(
			req.params.id,
			{ $set: taxFields },
			{ new: true, runValidators: true }
		);

		res.status(200).json({
			success: true,
			data: tax,
			message: "Tax updated successfully",
		});
	} catch (err) {
		next(new ErrorResponse(err.message || "Something went wrong"), 500);
	}
});

// @desc Delete a tax
// @route DELETE /api/admin/delete/tax/:id
// @access Private (Admin)
const deleteTax = asyncHandler(async (req, res, next) => {
	try {
		const tax = await Tax.findById(req.params.id);

		if (!tax) {
			return next(
				new ErrorResponse(`Tax not found with id of ${req.params.id}`, 404)
			);
		}

		await tax.deleteOne();

		// also delete from the Organization data
		const organization = await Organization.findById(req.organizationId);
		if (organization) {
			organization.taxes.pull(req.params.id);
			await organization.save();
		}

		res.status(200).json({
			success: true,
			data: {},
			message: "Tax removed successfully",
		});
	} catch (error) {
		next(
			new ErrorResponse(
				error.message || "Something went wrong,please try again !"
			),
			500
		);
	}
});

module.exports = {
	createTax,
	getTaxes,
	getTaxById,
	updateTax,
	deleteTax,
};
