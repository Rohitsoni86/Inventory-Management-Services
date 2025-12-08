const express = require("express");
const {
	getCustomers,
	createCustomer,
} = require("../controllers/customerController");
const advanceResults = require("../middlewares/advanceResult");
const { CustomerSchema } = require("../models/customerModel");
const customerRouter = express.Router();

customerRouter.get(
	"/list",
	advanceResults(CustomerSchema, "Customer", {
		searchFields: ["name", "email", "customerCode", "phoneNo"],
		selectableFields:
			"honorific name email customerCode phoneNo postalCode active city state createdAt address gender",
	}),
	getCustomers
);

customerRouter.post("/create", createCustomer);

module.exports = customerRouter;
