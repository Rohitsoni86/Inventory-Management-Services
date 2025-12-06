const express = require("express");

const {
	searchProducts,
	getProductDetails,
} = require("../controllers/productController");

const productRouter = express.Router();

productRouter.get("/search", searchProducts);
productRouter.get("/get/product/:id", getProductDetails);

module.exports = productRouter;
