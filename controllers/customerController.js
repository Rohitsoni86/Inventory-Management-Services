const { CustomerModel } = require("../models/customerModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("express-async-handler");

async function generateCustomerCode(organizationId) {
	const lastCustomer = await CustomerModel.findOne({
		organizations: organizationId,
	})
		.sort({ createdAt: -1 })
		.select("customerCode")
		.lean();

	if (!lastCustomer || !lastCustomer.customerCode) {
		return "CUST-0001";
	}

	const match = lastCustomer.customerCode.match(/(\d+)$/);
	if (!match) return `${lastCustomer.customerCode}-1`; // Fallback
	const nextNum = String(parseInt(match[1], 10) + 1).padStart(4, "0");
	return `CUST-${nextNum}`;
}

const createCustomer = asyncHandler(async (req, res, next) => {
	console.log("Create Customer Called", req.body);
	const organizationId = req.organizationId;
	const { user } = req;
	const {
		honorific,
		gender,
		name,
		countryCode,
		flagCode,
		phoneNo,
		email,
		address,
		city,
		state,
		country,
		postalCode,
	} = req.body;

	try {
		const customerCode = await generateCustomerCode(organizationId);
		const customer = await CustomerModel.create({
			name,
			honorific,
			gender,
			countryCode,
			flagCode,
			phoneNo,
			address,
			city,
			state,
			country,
			postalCode,
			email: email || "",
			customerCode,
			organizations: [organizationId],
			createdBy: user.id,
		});

		res.status(201).json({
			success: true,
			data: customer,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
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
	createCustomer,
};
