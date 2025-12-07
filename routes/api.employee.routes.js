const express = require("express");
const {
	createEmployee,
	getEmployees,
	getEmployeeById,
	updateEmployee,
	deleteEmployee,
} = require("../controllers/employeeController");
const { verifyOrganizationJWT } = require("../middlewares/verifyJWT");
const advanceResults = require("../middlewares/advanceResult");
const { UserSchema } = require("../models/userModel");
const router = express.Router();

router.use(verifyOrganizationJWT);
// ?roles[in]=employee&roles[in]=manager
router.get(
	"/list",
	advanceResults(UserSchema, "User", {
		searchFields: [
			"firstName",
			"lastName",
			"email",
			"employeeCode",
			"userCode",
			"role",
		],
		selectableFields:
			"firstName lastName email role status phone city state createdAt employeeCode userCode roles",
	}),
	getEmployees
);

router
	.route("/:id")
	.get(getEmployeeById)
	.put(updateEmployee)
	.delete(deleteEmployee);

module.exports = router;
