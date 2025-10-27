const express = require("express");
const router = express.Router();

router.get("/check", (req, res) => {
	res.json({ message: "API is running!" });
});

router.use("/user", require("./user"));
router.use("/organization/admin", require("./api.admin.routes"));
router.use("/admin", require("./api.superAdmin.routes"));
router.use("/organization/employee", require("./api.employee.routes"));

module.exports = router;
