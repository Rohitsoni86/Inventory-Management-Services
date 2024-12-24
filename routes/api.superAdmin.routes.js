const express = require("express");
const {
	createSuperAdmin,
	loginSuperAdmin,
	verifyMFA,
	refresh,
	verifySuperAdminAuth,
} = require("../controllers/superAdminController");
const { verifyTemporaryToken, verifyJWT } = require("../middlewares/verifyJWT");
const superAdminRouter = express.Router();

// Create New Super Admin
superAdminRouter.post("/create", createSuperAdmin);
superAdminRouter.post("/login", loginSuperAdmin);
// Verify Super Admin
superAdminRouter.post("/verifyMFA", verifyTemporaryToken, verifyMFA);
// superAdminRouter.get("/refresh", refresh);
superAdminRouter.use(verifyJWT);
superAdminRouter.get("/verify/admin", verifySuperAdminAuth);

// Admin Actions Definitions

module.exports = superAdminRouter;
