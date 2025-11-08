const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { UnitFamily } = require("../models/unitFamiliyModel");
const Organization = require("../models/organizationModel");
const { default: mongoose } = require("mongoose");

// @desc Create a new unit family
// @route POST /api/admin/create/unit-family
// @access Private (Admin)
const createUnitFamily = asyncHandler(async (req, res, next) => {
	const { name, shortName, description, baseUnit } = req.body;
	const organizationId = req.organizationId;

	// Make sure to cast baseUnitId to ObjectId if it's provided
	let baseUnitId;
	if (baseUnit && baseUnit._id) {
		baseUnitId = new mongoose.Types.ObjectId(baseUnit._id); // Casting to ObjectId
	}

	if (!name || !shortName) {
		return next(
			new ErrorResponse("Unit family name and short name are required", 400)
		);
	}

	const unitFamilyExists = await UnitFamily.findOne({ name });
	if (unitFamilyExists) {
		return next(
			new ErrorResponse("Unit family with this name already exists", 400)
		);
	}

	try {
		const unitFamilyData = {
			name,
			shortName,
			description,
			createdBy: req.user.id,
			organizations: [organizationId],
		};

		// Conditionally add baseUnitId if provided
		if (baseUnitId) {
			unitFamilyData.baseUnitId = baseUnitId;
		}

		const unitFamily = await UnitFamily.create(unitFamilyData);

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.unitFamilies.push(unitFamily._id);
		await organization.save();

		res.status(201).json({
			success: true,
			data: unitFamily,
			message: "Unit family created successfully",
		});
	} catch (error) {
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all unit families
// @route GET /api/admin/get/unit-families
// @access Private (Admin)
const getUnitFamilies = asyncHandler(async (req, res, next) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single unit family by ID
// @route GET /api/admin/get/unit-family/:id
// @access Private (Admin)
const getUnitFamilyById = asyncHandler(async (req, res, next) => {
	try {
		const unitFamily = await UnitFamily.findById(req.params.id).populate(
			"baseUnitId"
		);

		if (!unitFamily) {
			return next(
				new ErrorResponse(
					`Unit family not found with id of ${req.params.id}`,
					404
				)
			);
		}

		res.status(200).json({
			success: true,
			data: unitFamily,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a unit family
// @route PUT /api/admin/update/unit-family/:id
// @access Private (Admin)
const updateUnitFamily = asyncHandler(async (req, res, next) => {
	const { name, shortName, description, baseUnitId, status } = req.body;

	try {
		// Build unit family object
		const unitFamilyFields = {};
		if (name) unitFamilyFields.name = name;
		if (shortName) unitFamilyFields.shortName = shortName;
		if (description) unitFamilyFields.description = description;
		if (baseUnitId) unitFamilyFields.baseUnitId = baseUnitId;
		if (status) unitFamilyFields.status = status;
		unitFamilyFields.updatedBy = req.user.id;

		let unitFamily = await UnitFamily.findById(req.params.id);

		if (!unitFamily) {
			return next(
				new ErrorResponse(
					`Unit family not found with id of ${req.params.id}`,
					404
				)
			);
		}

		unitFamily = await UnitFamily.findByIdAndUpdate(
			req.params.id,
			{ $set: unitFamilyFields },
			{ new: true, runValidators: true }
		);

		res.status(200).json({
			success: true,
			data: unitFamily,
			message: "Unit family updated successfully",
		});
	} catch (err) {
		next(new ErrorResponse(err.message || "Something went wrong"), 500);
	}
});

// @desc Delete a unit family
// @route DELETE /api/admin/delete/unit-family/:id
// @access Private (Admin)
const deleteUnitFamily = asyncHandler(async (req, res, next) => {
	try {
		const unitFamily = await UnitFamily.findById(req.params.id);

		if (!unitFamily) {
			return next(
				new ErrorResponse(
					`Unit family not found with id of ${req.params.id}`,
					404
				)
			);
		}

		await unitFamily.deleteOne();

		// also delete from the Organization data
		const organization = await Organization.findById(req.organizationId);
		if (organization) {
			organization.unitFamilies.pull(req.params.id);
			await organization.save();
		}

		res.status(200).json({
			success: true,
			data: {},
			message: "Unit family removed successfully",
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
	createUnitFamily,
	getUnitFamilies,
	getUnitFamilyById,
	updateUnitFamily,
	deleteUnitFamily,
};
