const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { TaxGroup } = require("../models/taxGroupModel");
const Organization = require("../models/organizationModel");
const { Tax } = require("../models/taxModel");
const { default: mongoose } = require("mongoose");

// @desc Create a new tax group
// @route POST /api/admin/create/tax-group
// @access Private (Admin)
const createTaxGroup = asyncHandler(async (req, res, next) => {
	const { name, description, taxRates, effectiveFrom } = req.body;
	const organizationId = req.organizationId;

	if (!name || !taxRates || taxRates.length === 0) {
		return next(
			new ErrorResponse(
				"Tax group name and at least one tax rate are required",
				400
			)
		);
	}

	const taxGroupExists = await TaxGroup.findOne({ name });
	if (taxGroupExists) {
		return next(
			new ErrorResponse("Tax group with this name already exists", 400)
		);
	}

	try {
		// Validate if all provided taxRates exist
		const taxRateIds = taxRates.map((tax) => new mongoose.Types.ObjectId(tax));
		const foundTaxRates = await Tax.find({ _id: { $in: taxRateIds } });

		if (foundTaxRates.length !== taxRates.length) {
			return next(
				new ErrorResponse("One or more provided tax rates do not exist", 400)
			);
		}

		// Calculate totalTaxRate
		const totalTaxRate = foundTaxRates.reduce((sum, tax) => sum + tax.rate, 0);

		const taxGroup = await TaxGroup.create({
			name,
			description,
			effectiveFrom,
			taxRates: taxRateIds,
			totalTaxRate,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.taxGroups.push(taxGroup._id);
		await organization.save();

		res.status(201).json({
			success: true,
			data: taxGroup,
			message: "Tax group created successfully",
		});
	} catch (error) {
		console.log("Error In creating tax group ==>", error);
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all tax groups
// @route GET /api/admin/get/tax-groups
// @access Private (Admin)
const getTaxGroups = asyncHandler(async (req, res, next) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single tax group by ID
// @route GET /api/admin/get/tax-group/:id
// @access Private (Admin)
const getTaxGroupById = asyncHandler(async (req, res, next) => {
	try {
		const taxGroup = await TaxGroup.findById(req.params.id).populate(
			"taxRates"
		);

		if (!taxGroup) {
			return next(
				new ErrorResponse(
					`Tax group not found with id of ${req.params.id}`,
					404
				)
			);
		}

		res.status(200).json({
			success: true,
			data: taxGroup,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a tax group
// @route PUT /api/admin/update/tax-group/:id
// @access Private (Admin)
const updateTaxGroup = asyncHandler(async (req, res, next) => {
	const { name, description, effectiveFrom, taxRates, status } = req.body;

	try {
		// Build tax group object
		const taxGroupFields = {};
		if (name) taxGroupFields.name = name;
		if (description) taxGroupFields.description = description;
		if (effectiveFrom) taxGroupFields.effectiveFrom = effectiveFrom;
		if (taxRates && taxRates.length > 0) {
			const taxRateIds = taxRates.map(
				(tax) => new mongoose.Types.ObjectId(tax)
			);
			const foundTaxRates = await Tax.find({ _id: { $in: taxRateIds } });

			if (foundTaxRates.length !== taxRates.length) {
				return next(
					new ErrorResponse("One or more provided tax rates do not exist", 400)
				);
			}
			taxGroupFields.taxRates = taxRateIds;
			taxGroupFields.totalTaxRate = foundTaxRates.reduce(
				(sum, tax) => sum + tax.rate,
				0
			);
		}
		if (status) taxGroupFields.status = status;
		taxGroupFields.updatedBy = req.user.id;

		let taxGroup = await TaxGroup.findById(req.params.id);

		if (!taxGroup) {
			return next(
				new ErrorResponse(
					`Tax group not found with id of ${req.params.id}`,
					404
				)
			);
		}

		taxGroup = await TaxGroup.findByIdAndUpdate(
			req.params.id,
			{ $set: taxGroupFields },
			{ new: true, runValidators: true }
		);

		res.status(200).json({
			success: true,
			data: taxGroup,
			message: "Tax group updated successfully",
		});
	} catch (err) {
		next(new ErrorResponse(err.message || "Something went wrong"), 500);
	}
});

// @desc Delete a tax group
// @route DELETE /api/admin/delete/tax-group/:id
// @access Private (Admin)
const deleteTaxGroup = asyncHandler(async (req, res, next) => {
	try {
		const taxGroup = await TaxGroup.findById(req.params.id);

		if (!taxGroup) {
			return next(
				new ErrorResponse(
					`Tax group not found with id of ${req.params.id}`,
					404
				)
			);
		}

		await taxGroup.deleteOne();

		// also delete from the Organization data
		const organization = await Organization.findById(req.organizationId);
		if (organization) {
			organization.taxGroups.pull(req.params.id);
			await organization.save();
		}

		res.status(200).json({
			success: true,
			data: {},
			message: "Tax group removed successfully",
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
	createTaxGroup,
	getTaxGroups,
	getTaxGroupById,
	updateTaxGroup,
	deleteTaxGroup,
};
