const express = require("express");
const {
	addStock,
	getInventoryDetails,
} = require("../controllers/inventoryController");

const inventoryRouter = express.Router();

inventoryRouter.post("/add-stocks", addStock);
inventoryRouter.get("/details/:productId", getInventoryDetails);

module.exports = inventoryRouter;
