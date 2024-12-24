const express = require("express");
const {
	createEmployee,
	loginEmployee,
	verifyEmployee,
	refresh,
} = require("../controllers/employeeController");
const { verifyJWT } = require("../middlewares/verifyJWT");
const employeeRouter = express.Router();

// Create New Super Admin
employeeRouter.post("/create", createEmployee);
employeeRouter.post("/login", loginEmployee);
// Verify Super Admin
employeeRouter.post("/verify", verifyEmployee);
// employeeRouter.get("/refresh", refresh);
employeeRouter.use(verifyOrganizationJWT);

// Organization Actions Definitions

module.exports = employeeRouter;
