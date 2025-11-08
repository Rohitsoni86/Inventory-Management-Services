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

const { unitFamilySchema } = require("../models/unitFamiliyModel");
const {
	createUnitFamily,
	getUnitFamilyById,
	updateUnitFamily,
	deleteUnitFamily,
	getUnitFamilies,
} = require("../controllers/unitFamilyController");

const {
	createProductType,
	getProductTypes,
	getProductTypeById,
	updateProductType,
	deleteProductType,
} = require("../controllers/productTypeController");

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

// Unit Family

adminRouter.post("/create/unit-family", createUnitFamily);
adminRouter.get(
	"/get/unit-families",
	advanceResults(unitFamilySchema, "UnitFamily", {
		searchFields: ["name", "shortName", "description", "status"],
		selectableFields: "name shortName description status createdAt",
	}),
	getUnitFamilies
);
adminRouter.get("/get/unit-family/:id", getUnitFamilyById);
adminRouter.put("/update/unit-family/:id", updateUnitFamily);
adminRouter.delete("/delete/unit-family/:id", deleteUnitFamily);

// Unit Routes

adminRouter.post("/create/unit", createUnit);
adminRouter.get(
	"/get/units",
	advanceResults(measuringUnitSchema, "Unit", {
		searchFields: ["name", "shortName", "status"],
		selectableFields:
			"name shortName status createdAt familyId multiplierToBase isBase ",
		populate: ["family"],
	}),
	getUnits
);
adminRouter.get("/get/unit/:id", getUnitById);
adminRouter.put("/update/unit/:id", updateUnit);
adminRouter.delete("/delete/unit/:id", deleteUnit);

// Product Type

const { ProductTypeSchema } = require("../models/productType");

adminRouter.post("/create/product-type", createProductType);
adminRouter.get(
	"/get/product-types",
	advanceResults(ProductTypeSchema, "ProductType", {
		searchFields: ["name", "code", "description", "status"],
		selectableFields:
			"name code description trackInventory hasVariants allowBundling trackBatches trackSerials allowFractionalQty isService status createdAt",
	}),
	getProductTypes
);
adminRouter.get("/get/product-type/:id", getProductTypeById);
adminRouter.put("/update/product-type/:id", updateProductType);
adminRouter.delete("/delete/product-type/:id", deleteProductType);

module.exports = adminRouter;
