const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { default: mongoose } = require("mongoose");
const Organization = require("../models/organizationModel");

const { ProductType } = require("../models/productType");

// @desc Create a new product type
// @route POST /api/admin/create/product-type
// @access Private (Admin)
const createProductType = asyncHandler(async (req, res, next) => {
	const {
		name,
		code,
		description,
		trackInventory,
		hasVariants,
		allowBundling,
		trackBatches,
		trackSerials,
		allowFractionalQty,
		isService,
	} = req.body;
	const organizationId = req.organizationId;

	if (!name || !code) {
		return next(
			new ErrorResponse("Product type name and code are required", 400)
		);
	}

	const productTypeExists = await ProductType.findOne({
		name,
		organizations: organizationId,
	});

	if (productTypeExists) {
		return next(
			new ErrorResponse("Product type with this name already exists", 400)
		);
	}

	try {
		const productType = await ProductType.create({
			name,
			code,
			description,
			trackInventory,
			hasVariants,
			allowBundling,
			trackBatches,
			trackSerials,
			allowFractionalQty,
			isService,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.productTypes.push(productType._id);
		await organization.save();

		res.status(201).json({
			success: true,
			data: productType,
			message: "Product type created successfully",
		});
	} catch (error) {
		console.log("Error In creating product type ==>", error);
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all product types
// @route GET /api/admin/get/product-types
// @access Private (Admin)
const getProductTypes = asyncHandler(async (req, res, next) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single product type by ID
// @route GET /api/admin/get/product-type/:id
// @access Private (Admin)
const getProductTypeById = asyncHandler(async (req, res, next) => {
	try {
		const productType = await ProductType.findById(req.params.id);

		if (!productType) {
			return next(
				new ErrorResponse(
					`Product type not found with id of ${req.params.id}`,
					404
				)
			);
		}

		res.status(200).json({
			success: true,
			data: productType,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a product type
// @route PUT /api/admin/update/product-type/:id
// @access Private (Admin)
const updateProductType = asyncHandler(async (req, res, next) => {
	const {
		name,
		code,
		description,
		trackInventory,
		hasVariants,
		allowBundling,
		trackBatches,
		trackSerials,
		allowFractionalQty,
		isService,
		status,
	} = req.body;

	try {
		// Build product type object
		const productTypeFields = {};
		if (name) productTypeFields.name = name;
		if (code) productTypeFields.code = code;
		if (description) productTypeFields.description = description;
		if (trackInventory !== undefined)
			productTypeFields.trackInventory = trackInventory;
		if (hasVariants !== undefined) productTypeFields.hasVariants = hasVariants;
		if (allowBundling !== undefined)
			productTypeFields.allowBundling = allowBundling;
		if (trackBatches !== undefined)
			productTypeFields.trackBatches = trackBatches;
		if (trackSerials !== undefined)
			productTypeFields.trackSerials = trackSerials;
		if (allowFractionalQty !== undefined)
			productTypeFields.allowFractionalQty = allowFractionalQty;
		if (isService !== undefined) productTypeFields.isService = isService;
		if (status) productTypeFields.status = status;
		productTypeFields.updatedBy = req.user.id;

		let productType = await ProductType.findById(req.params.id);

		if (!productType) {
			return next(
				new ErrorResponse(
					`Product type not found with id of ${req.params.id}`,
					404
				)
			);
		}

		productType = await ProductType.findByIdAndUpdate(
			req.params.id,
			{ $set: productTypeFields },
			{ new: true, runValidators: true }
		);

		res.status(200).json({
			success: true,
			data: productType,
			message: "Product type updated successfully",
		});
	} catch (err) {
		next(new ErrorResponse(err.message || "Something went wrong"), 500);
	}
});

// @desc Delete a product type
// @route DELETE /api/admin/delete/product-type/:id
// @access Private (Admin)
const deleteProductType = asyncHandler(async (req, res, next) => {
	try {
		const productType = await ProductType.findById(req.params.id);

		if (!productType) {
			return next(
				new ErrorResponse(
					`Product type not found with id of ${req.params.id}`,
					404
				)
			);
		}

		await productType.deleteOne();

		// also delete from the Organization data
		const organization = await Organization.findById(req.organizationId);
		if (organization) {
			organization.productTypes.pull(req.params.id);
			await organization.save();
		}

		res.status(200).json({
			success: true,
			data: {},
			message: "Product type removed successfully",
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
	createProductType,
	getProductTypes,
	getProductTypeById,
	updateProductType,
	deleteProductType,
};
