const express = require("express");
const { createNewUser, loginAdmin } = require("../controllers/userController");

const userRouter = express.Router();

userRouter.route("/organization/add").post(createNewUser);
userRouter.route("/organization/login").post(loginAdmin);

module.exports = userRouter;
