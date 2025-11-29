const express = require("express");

const advanceResults = require("../middlewares/advanceResult");
const { searchProducts } = require("../controllers/productController");

const productRouter = express.Router();

productRouter.get("/organization/products/search", searchProducts);

module.exports = productRouter;
