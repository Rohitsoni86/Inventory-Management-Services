const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { MeasuringUnit } = require("../models/measuringUnitsModel");
const Organization = require("../models/organizationModel");
const { object } = require("joi");
const { default: mongoose } = require("mongoose");
const { UnitFamily } = require("../models/unitFamiliyModel");

// @desc Create a new unit
// @route POST /api/admin/create/unit
// @access Private (Admin)
const createUnit = asyncHandler(async (req, res, next) => {
	const { name, shortName, description, multiplierToBase, isBase, family } =
		req.body;
	const organizationId = req.organizationId;

	if (!name || !shortName) {
		return next(
			new ErrorResponse("Unit name and short name are required", 400)
		);
	}

	if (!family?._id) {
		return next(new ErrorResponse("A unit must belong to a family.", 400));
	}

	const unitExists = await MeasuringUnit.findOne({
		name,
		organizations: organizationId,
	});
	if (unitExists) {
		return next(new ErrorResponse("Unit with this name already exists", 400));
	}

	const familyUnitID = new mongoose.Types.ObjectId(family._id);
	const unitFamily = await UnitFamily.findById(familyUnitID);

	if (!unitFamily) {
		return next(new ErrorResponse(`Unit Family not found`, 404));
	}

	// Check if a base unit is being created and if the family already has one.
	if (isBase && unitFamily.baseUnit) {
		return next(
			new ErrorResponse(
				`Unit family '${unitFamily.name}' already has a base unit. Only one base unit is allowed per family.`,
				400
			)
		);
	}

	try {
		const unit = await MeasuringUnit.create({
			name,
			shortName,
			description,
			multiplierToBase,
			isBase,
			family: familyUnitID,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		// Here we need to update the Unit Family for Base unit
		if (unit.isBase) {
			unitFamily.baseUnit = unit._id;
			await unitFamily.save();
		}

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
		console.log("Error In creating unit ==>", error);
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
	const { name, shortName, description, status, isBase, multiplierToBase } =
		req.body;
	const organizationId = req.organizationId;

	try {
		let unit = await MeasuringUnit.findById(req.params.id);

		if (!unit) {
			return next(
				new ErrorResponse(`Unit not found with id of ${req.params.id}`, 404)
			);
		}

		// If name is being changed, check for uniqueness within the organization
		if (name && name !== unit.name) {
			const unitExists = await MeasuringUnit.findOne({
				name,
				organizations: organizationId,
				_id: { $ne: req.params.id },
			});
			if (unitExists) {
				return next(
					new ErrorResponse("Another unit with this name already exists", 400)
				);
			}
		}

		const unitFields = { updatedBy: req.user.id };
		if (name) unitFields.name = name;
		if (shortName) unitFields.shortName = shortName;
		if (description) unitFields.description = description;
		if (status) unitFields.status = status;
		if (isBase !== undefined) unitFields.isBase = isBase;
		if (multiplierToBase !== undefined)
			unitFields.multiplierToBase = multiplierToBase;

		// Handle base unit logic if `isBase` is being changed
		if (isBase !== undefined && isBase !== unit.isBase) {
			const unitFamily = await UnitFamily.findById(unit.family);
			if (!unitFamily) {
				return next(new ErrorResponse(`Associated Unit Family not found`, 404));
			}

			if (isBase === true) {
				// Trying to make this the new base unit
				if (
					unitFamily.baseUnit &&
					unitFamily.baseUnit.toString() !== unit._id.toString()
				) {
					return next(
						new ErrorResponse(
							`Unit family '${unitFamily.name}' already has a base unit. Cannot set another.`,
							400
						)
					);
				}
				// A base unit must have a multiplier of 1.
				unitFields.multiplierToBase = 1;
				unitFamily.baseUnit = unit._id;
				await unitFamily.save();
			} else {
				// isBase is false, trying to remove this as a base unit
				if (
					unitFamily.baseUnit &&
					unitFamily.baseUnit.toString() === unit._id.toString()
				) {
					unitFamily.baseUnit = null;
					await unitFamily.save();
				}
			}
		}

		unit = await MeasuringUnit.findByIdAndUpdate(
			req.params.id,
			{ $set: unitFields },
			{ new: true, runValidators: true }
		);

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
