const express = require("express");
const {
	createEmployee,
	loginEmployee,
	verifyEmployee,
	refresh,
} = require("../controllers/employeeController");

const adminRouter = express.Router();

adminRouter.post("/create/employee", createEmployee);
// Verify Super Admin
adminRouter.post("/verify", verifyEmployee);

module.exports = adminRouter;
