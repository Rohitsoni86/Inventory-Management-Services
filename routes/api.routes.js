const express = require("express");
const {
	verifyOrganizationJWT,
	verifyAdminJWT,
} = require("../middlewares/verifyJWT");
const router = express.Router();

router.get("/check", (req, res) => {
	res.json({ message: "API is running!" });
});

router.use("/user", require("./user"));
// router.use(
// 	"/organization/supper-admin",
// 	verifyAdminJWT,
// 	require("./api.supperAdmin.routes")
// );
router.use(
	"/organization/admin",
	verifyAdminJWT,
	require("./api.admin.routes")
);
// router.use("/admin", require("./api.superAdmin.routes"));
router.use(
	"/organization/employees",
	verifyAdminJWT,
	require("./api.employee.routes")
);

// POS
router.use(verifyOrganizationJWT);
router.use("/organization/customers", require("./api.customers.routes"));
router.use("/organization/products", require("./api.product.routes"));
router.use("/organization/pos", require("./api.sales.routes"));
router.use(
	"/organization/inventory/overview",
	require("./api.overview.routes")
);
router.use(
	"/organization/inventory",
	verifyAdminJWT,
	require("./api.inventory.routes")
);

module.exports = router;
