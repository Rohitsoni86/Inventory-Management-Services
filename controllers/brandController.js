const asyncHandler = require("express-async-handler");
const { Brand } = require("../models/brandsModel");
const ErrorResponse = require("../utils/errorResponse");
const Organization = require("../models/organizationModel");

// @desc Create a new brand
// @route POST /api/admin/create/brand
// @access Private (Admin)
const createBrand = asyncHandler(async (req, res, next) => {
	const { name, description, status } = req.body;
	const organizationId = req.organizationId;

	if (!name) {
		return next(new ErrorResponse("Brand name is required", 400));
	}

	const brandExists = await Brand.findOne({
		name,
		organizations: organizationId,
	});
	if (brandExists) {
		return next(new ErrorResponse("Brand with this name already exists", 400));
	}

	try {
		const brand = await Brand.create({
			name,
			description,
			status,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.brands.push(brand._id);
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
			data: brand,
			message: "Brand created successfully",
		});
	} catch (error) {
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all brands
// @route GET /api/admin/get/brands
// @access Private (Admin)
const getBrands = asyncHandler(async (req, res, next) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single brand by ID
// @route GET /api/admin/get/brand/:id
// @access Private (Admin)
const getBrandById = asyncHandler(async (req, res, next) => {
	try {
		const { id } = req.params;
		const brand = await Brand.findById(id);
		if (!brand) {
			return next(new ErrorResponse(`Brand not found !`, 404));
		}

		res.status(200).json({
			success: true,
			data: brand,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a brand
// @route PUT /api/admin/update/brands/:id
// @access Private (Admin)
const updateBrand = asyncHandler(async (req, res, next) => {
	const { name, description, status } = req.body;

	try {
		// Build brand object
		const filedsToUpdate = {};
		if (name) filedsToUpdate.name = name;
		if (description) filedsToUpdate.description = description;
		if (status) filedsToUpdate.status = status;
		filedsToUpdate.updatedBy = req.user.id;

		let brand = await Brand.findById(req.params.id);

		if (!brand) {
			return next(new ErrorResponse(`Brand not found !`, 404));
		}

		brand = await Brand.findByIdAndUpdate(
			req.params.id,
			{ $set: filedsToUpdate },
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
			data: brand,
			message: "Brand updated successfully",
		});
	} catch (error) {
		next(new ErrorResponse(error.message || "Something went wrong"), 500);
	}
});

// @desc Delete a brand
// @route DELETE /api/admin/delete/brand/:id
// @access Private (Admin)
const deleteBrand = asyncHandler(async (req, res, next) => {
	try {
		const brand = await Brand.findById(req.params.id);

		if (!brand) {
			return next(new ErrorResponse(`Brand not found !`, 404));
		}

		await brand.deleteOne();

		// also delete from the Organizztion data

		const organization = await Organization.findById(req.organizationId);
		if (organization) {
			organization.brands.pull(req.params.id);
			await organization.save();
		}

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
			message: "Brand removed successfully",
		});
	} catch (error) {
		next(new ErrorResponse(error.message || "Something went wrong"), 500);
	}
});

module.exports = {
	createBrand,
	getBrands,
	getBrandById,
	updateBrand,
	deleteBrand,
};
