const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("express-async-handler");

const createCustomer = asyncHandler(async (req, res, next) => {
	console.log("Create Customer Called", req.body);
	const organizationId = req.organizationId;
	const { user } = req;
});

const getCustomers = asyncHandler(async (req, res, next) => {
	const { user, organizationId } = req;
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

module.exports = {
	getCustomers,
};
