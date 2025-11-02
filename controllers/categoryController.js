const asyncHandler = require("express-async-handler");

const ErrorResponse = require("../utils/errorResponse");
const ProductCategory = require("../models/productCategoriesModel");
const Organization = require("../models/organizationModel");

// @desc Create a new category
// @route POST /api/admin/create/category
// @access Private (Admin)
const createCategory = asyncHandler(async (req, res, next) => {
	const { name, description, status } = req.body;
	const organizationId = req.organizationId;

	if (!name) {
		return next(new ErrorResponse("Category name is required", 400));
	}

	const Exists = await ProductCategory.findOne({ name });
	if (Exists) {
		return next(
			new ErrorResponse("Category with this name already exists", 400)
		);
	}

	console.log("Created By User 🧨🧨🎇 ==>", req.user);

	try {
		const category = await ProductCategory.create({
			name,
			description,
			status,
			createdBy: req.user.id,
			organizations: [organizationId],
		});

		// here we need to add category to the organization details we created earlier

		const organization = await Organization.findById(req.organizationId);
		if (!organization) {
			return next(new ErrorResponse("Organization not found", 404));
		}
		organization.productsCategories.push(category._id);
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
			data: category,
			message: "Category created successfully",
		});
	} catch (error) {
		return res.status(500).json({ success: false, data: error.message });
	}
});

// @desc Get all brands
// @route GET /api/admin/get/brands
// @access Private (Admin)
const getCategories = asyncHandler(async (req, res, next) => {
	// console.log("Get Categories List ==>", res);
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Get a single category by ID
// @route GET /api/admin/get/category/:id
// @access Private (Admin)
const getCategoryById = asyncHandler(async (req, res, next) => {
	try {
		const { id } = req.params;
		const category = await ProductCategory.findById(id);
		if (!category) {
			return next(new ErrorResponse(`Category not found !`, 404));
		}

		res.status(200).json({
			success: true,
			data: category,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

// @desc Update a category
// @route PUT /api/admin/update/brands/:id
// @access Private (Admin)
const updateCategory = asyncHandler(async (req, res, next) => {
	const { name, description, status } = req.body;

	try {
		// Build category object
		const filedsToUpdate = {};
		if (name) filedsToUpdate.name = name;
		if (description) filedsToUpdate.description = description;
		if (status) filedsToUpdate.status = status;
		filedsToUpdate.updatedBy = req.user.id;

		let category = await ProductCategory.findById(req.params.id);

		if (!category) {
			return next(new ErrorResponse(`Category not found !`, 404));
		}

		category = await ProductCategory.findByIdAndUpdate(
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
			data: category,
			message: "Category updated successfully",
		});
	} catch (error) {
		next(new ErrorResponse(error.message || "Something went wrong"), 500);
	}
});

// @desc Delete a category
// @route DELETE /api/admin/delete/category/:id
// @access Private (Admin)
const deleteCategory = asyncHandler(async (req, res, next) => {
	try {
		const category = await ProductCategory.findById(req.params.id);

		if (!category) {
			return next(new ErrorResponse(`Category not found !`, 404));
		}

		// this is a problem here as it deletes the first record fetched not by the id as we are accessing it witht the ProductModel itself so
		/// never use this method
		// await ProductCategory.deleteOne();

		await category.deleteOne(); // use this or use the method findByIdAndDelete only

		// also delete from the Organizztion data

		const organization = await Organization.findById(req.organizationId);
		if (organization) {
			organization.productsCategories.pull(req.params.id);
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
			message: "Category removed successfully",
		});
	} catch (error) {
		next(new ErrorResponse(error.message || "Something went wrong"), 500);
	}
});

module.exports = {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
