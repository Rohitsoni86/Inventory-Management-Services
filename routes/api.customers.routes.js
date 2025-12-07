const express = require("express");
const { getCustomers } = require("../controllers/customerController");
const advanceResults = require("../middlewares/advanceResult");
const { CustomerSchema } = require("../models/customerModel");
const customerRouter = express.Router();

customerRouter.get(
	"/list",
	advanceResults(CustomerSchema, "Customer", {
		searchFields: ["name", "email", "customerCode", "phoneNo"],
		selectableFields:
			"name email customerCode phoneNo postalCode active city state createdAt address",
	}),
	getCustomers
);
module.exports = customerRouter;
