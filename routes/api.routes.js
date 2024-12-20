const express = require("express");
const router = express.Router();

router.get("/check", (req, res) => {
	res.json({ message: "API is running!" });
});

module.exports = router;
