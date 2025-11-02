const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { MeasuringUnit } = require("../models/measuringUnitsModel");
const Organization = require("../models/organizationModel");

// @desc Create a new unit
// @route POST /api/admin/create/unit
// @access Private (Admin)
const createUnit = asyncHandler(async (req, res, next) => {
	const { name, shortName, description } = req.body;
	const organizationId = req.organizationId;

	if (!name || !shortName) {
		return next(
			new ErrorResponse("Unit name and short name are required", 400)
		);
	}

	const unitExists = await MeasuringUnit.findOne({ name });
	if (unitExists) {
		return next(new ErrorResponse("Unit with this name already exists", 400));
	}

	try {
		const unit = await MeasuringUnit.create({
			name,
			shortName,
			description,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.measuringUnits.push(unit._id);
		await organization.save();

		// await logChange({
		// 	tenantDb,
		// 	collectionName: "--",
		// 	documentId: result._id,
		// 	operation: "create",
		// 	oldData: null,
		// 	newData: result.toObject(),
		// 	modifiedBy: req.user,
		// });

		res.status(201).json({
			success: true,
			data: unit,
			message: "Unit created successfully",
		});
	} catch (error) {
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all units
// @route GET /api/admin/get/units
// @access Private (Admin)
const getUnits = asyncHandler(async (req, res, next) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single unit by ID
// @route GET /api/admin/get/unit/:id
// @access Private (Admin)
const getUnitById = asyncHandler(async (req, res, next) => {
	try {
		const unit = await MeasuringUnit.findById(req.params.id);

		if (!unit) {
			return next(
				new ErrorResponse(`Unit not found with id of ${req.params.id}`, 404)
			);
		}

		res.status(200).json({
			success: true,
			data: unit,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a unit
// @route PUT /api/admin/update/units/:id
// @access Private (Admin)
const updateUnit = asyncHandler(async (req, res, next) => {
	const { name, shortName, description, status } = req.body;

	try {
		// Build unit object
		const unitFields = {};
		if (name) unitFields.name = name;
		if (shortName) unitFields.shortName = shortName;
		if (description) unitFields.description = description;
		if (status) unitFields.status = status;
		unitFields.updatedBy = req.user.id;

		let unit = await MeasuringUnit.findById(req.params.id);

		if (!unit) {
			return next(
				new ErrorResponse(`Unit not found with id of ${req.params.id}`, 404)
			);
		}

		unit = await MeasuringUnit.findByIdAndUpdate(
			req.params.id,
			{ $set: unitFields },
			{ new: true, runValidators: true }
		);
		// await logChange({
		// 	tenantDb,
		// 	collectionName: "--",
		// 	documentId: id,
		// 	operation: "update",
		// 	oldData: oldDoc,
		// 	newData: updatedDoc.toObject(),
		// 	modifiedBy: req.user,
		// });

		res.status(200).json({
			success: true,
			data: unit,
			message: "Unit updated successfully",
		});
	} catch (err) {
		next(new ErrorResponse(error.message || "Something went wrong"), 500);
	}
});

// @desc Delete a unit
// @route DELETE /api/admin/delete/unit/:id
// @access Private (Admin)
const deleteUnit = asyncHandler(async (req, res, next) => {
	try {
		const unit = await MeasuringUnit.findById(req.params.id);

		if (!unit) {
			return next(
				new ErrorResponse(`Unit not found with id of ${req.params.id}`, 404)
			);
		}

		// await MeasuringUnit.deleteOne();
		await unit.deleteOne();

		// await logChange({
		// 	tenantDb,
		// 	collectionName: "--",
		// 	documentId: id,
		// 	operation: "delete",
		// 	oldData: docToDelete,
		// 	newData: null,
		// 	modifiedBy: req.user,
		// });

		res.status(200).json({
			success: true,
			data: {},
			message: "Unit removed successfully",
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
	createUnit,
	getUnits,
	getUnitById,
	updateUnit,
	deleteUnit,
};
