const express = require("express");
const router = express.Router();

router.get("/check", (req, res) => {
	res.json({ message: "API is running!" });
});

router.use("/user", require("./user"));

router.use("/admin", require("./api.superAdmin.routes"));

module.exports = router;
