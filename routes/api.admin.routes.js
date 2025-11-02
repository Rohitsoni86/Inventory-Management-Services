const express = require("express");
const {
	createBrand,
	getBrands,
	getBrandById,
	updateBrand,
	deleteBrand,
} = require("../controllers/brandController");

const {
	createUnit,
	getUnits,
	getUnitById,
	updateUnit,
	deleteUnit,
} = require("../controllers/unitController");
const advanceResults = require("../middlewares/advanceResult");
const { brandSchema } = require("../models/brandsModel");
const { categorySchema } = require("../models/productCategoriesModel");
const {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
} = require("../controllers/categoryController");
const { verifyOrganizationJWT } = require("../middlewares/verifyJWT");
const { measuringUnitSchema } = require("../models/measuringUnitsModel");

const adminRouter = express.Router();

// Category Routes
adminRouter.post("/create/category", createCategory);
adminRouter.get(
	"/get/category",
	advanceResults(categorySchema, "Category", {
		searchFields: ["name", "description", "status"],
		selectableFields: "name description status createdAt", // Default fields to select
	}),
	getCategories
);
adminRouter.get("/get/category/:id", getCategoryById);
adminRouter.put("/update/category/:id", updateCategory);
adminRouter.delete("/delete/category/:id", deleteCategory);

// Brand Routes
adminRouter.post("/create/brand", createBrand);
adminRouter.get(
	"/get/brands",
	advanceResults(brandSchema, "Brand", {
		searchFields: ["name", "description", "status"],
		selectableFields: "name description status createdAt",
	}),
	getBrands
);
adminRouter.get("/get/brand/:id", getBrandById);
adminRouter.put("/update/brand/:id", updateBrand);
adminRouter.delete("/delete/brand/:id", deleteBrand);

// Unit Routes

adminRouter.post("/create/unit", createUnit);
adminRouter.get(
	"/get/units",
	advanceResults(measuringUnitSchema, "Unit", {
		searchFields: ["name", "shortName", "status"],
		selectableFields: "name shortName status createdAt",
	}),
	getUnits
);
adminRouter.get("/get/unit/:id", getUnitById);
adminRouter.put("/update/unit/:id", updateUnit);
adminRouter.delete("/delete/unit/:id", deleteUnit);

module.exports = adminRouter;
