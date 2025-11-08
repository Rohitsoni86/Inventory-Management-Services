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
const { ProductTypeSchema } = require("../models/productType");
const { taxSchema } = require("../models/taxModel");
const { taxGroupSchema } = require("../models/taxGroupModel");
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
const {
	getTaxes,
	createTax,
	getTaxById,
	updateTax,
	deleteTax,
} = require("../controllers/taxController");
const {
	createTaxGroup,
	getTaxGroups,
	getTaxGroupById,
	updateTaxGroup,
	deleteTaxGroup,
} = require("../controllers/taxGroupController");

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

// Tax

adminRouter.post("/create/tax", createTax);
adminRouter.get(
	"/get/taxes",
	advanceResults(taxSchema, "Tax", {
		searchFields: ["name", "type", "status"],
		selectableFields:
			"name rate type effectiveFrom description status createdAt",
	}),
	getTaxes
);
adminRouter.get("/get/tax/:id", getTaxById);
adminRouter.put("/update/tax/:id", updateTax);
adminRouter.delete("/delete/tax/:id", deleteTax);

// Tax Group

adminRouter.post("/create/tax-group", createTaxGroup);
adminRouter.get(
	"/get/tax-groups",
	advanceResults(taxGroupSchema, "TaxGroup", {
		searchFields: ["name", "status"],
		selectableFields:
			"name totalTaxRate description effectiveFrom status createdAt",
		populate: ["taxRates"],
	}),
	getTaxGroups
);
adminRouter.get("/get/tax-group/:id", getTaxGroupById);
adminRouter.put("/update/tax-group/:id", updateTaxGroup);
adminRouter.delete("/delete/tax-group/:id", deleteTaxGroup);

module.exports = adminRouter;
