const ErrorResponse = require("../utils/errorResponse");

const errorHandler = (err, req, res, next) => {
	let error = { ...err };
	error.message = err.message;

	// Default fallback values
	let statusCode = error.statusCode || 500;
	let message = error.message || "Internal Server Error";
	let errors = error.errors || null;

	// Log the full error for debugging
	console.error("[Error Handler] ➤", err);

	// --- Handle Mongoose CastError (Invalid ObjectId)
	if (err.name === "CastError") {
		message = `Resource not found with id ${err.value}`;
		statusCode = 404;
	}

	// --- Handle Mongoose duplicate key error
	if (err.code === 11000) {
		const fields = Object.keys(err.keyValue);
		message = `Duplicate value for field: ${fields.join(", ")}`;
		statusCode = 400;
	}

	// --- Handle Mongoose validation errors
	if (err.name === "ValidationError") {
		errors = Object.values(err.errors).map((val) => ({
			field: val.path,
			message: val.message,
		}));
		message = "Validation failed";
		statusCode = 400;
	}

	// --- Handle JSON Web Token errors (optional, if you use JWT)
	if (err.name === "JsonWebTokenError") {
		message = "Invalid token";
		statusCode = 401;
	}

	if (err.name === "TokenExpiredError") {
		message = "Token expired";
		statusCode = 401;
	}

	// --- Handle custom ErrorResponse
	if (err instanceof ErrorResponse) {
		message = err.message || message;
		statusCode = err.statusCode || statusCode;
		errors = err.errors || errors;
	}

	// --- Send final structured response
	res.status(statusCode).json({
		success: false,
		message,
		errors,
		statusCode,
		timestamp: new Date().toISOString(),
		// path: req.originalUrl,
	});
};

module.exports = errorHandler;
