const express = require("express");

const { searchProducts } = require("../controllers/productController");
const {
	createSale,
	listSales,
	getSaleInvoice,
	getNextInvoiceNumber,
	searchPOSProducts,
} = require("../controllers/posController");

const salesRouter = express.Router();

salesRouter.get("/products/search", searchPOSProducts);

salesRouter.post("/create/sales", createSale);

salesRouter.get("/sales/list", listSales);
salesRouter.get("/sales/next-invoice-number", getNextInvoiceNumber);
salesRouter.get("/sales/invoice/:id", getSaleInvoice);

module.exports = salesRouter;
