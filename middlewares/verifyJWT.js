const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");

const verifyJWT = (req, res, next) => {
	const token = req.cookies.accessToken;
	let subDomain = req.headers.origin?.split(".")[0] || "";
	subDomain = subDomain.replace("https://", "");
	subDomain = subDomain.replace("http://", "");
	if (!token) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}

	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			if (err) {
				console.log(err);
				return res.status(403).json({ message: "Forbidden" });
			}
			req.user = decoded.UserInfo;
			req.roles = decoded.UserInfo.roles;
			next();
		}
	);
};

const verifyTemporaryToken = (req, res, next) => {
	const token = req.cookies.temporarytoken;
	if (!token) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}

	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			console.log(err);
			if (err) return res.status(403).json({ message: "Forbidden" });
			req.user = decoded;
			next();
		}
	);
};

const verifyOrganizationJWT = (req, res, next) => {
	const token = req.cookies.accessToken;
	let subDomain = req.headers.origin?.split(".")[0] || "";
	subDomain = subDomain.replace("https://", "");
	subDomain = subDomain.replace("http://", "");
	if (!token) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}

	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			if (err) {
				console.log(err);
				return res.status(403).json({ message: "Forbidden" });
			}
			// check for only admin and manager and emp roles
			if (
				!decoded.UserInfo.roles.includes("admin") &&
				!decoded.UserInfo.roles.includes("manager") &&
				!decoded.UserInfo.roles.includes("employee")
			) {
				return res
					.status(403)
					.json({ message: "Not authorized to access this route" });
			}
			// console.log("Verify JWT Token Data Values ==>", decoded);
			req.user = decoded.UserInfo;
			req.roles = decoded.UserInfo.roles;
			req.organizationId = decoded.organizationId;
			next();
		}
	);
};

// verify that it is an admin only
const verifyAdminJWT = (req, res, next) => {
	const token = req.cookies.accessToken;
	if (!token) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}
	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			if (err) {
				console.log(err);
				return res.status(403).json({ message: "Forbidden" });
			}

			// Check if the role is admin
			if (!decoded.UserInfo.roles.includes("admin")) {
				return res
					.status(403)
					.json({ message: "Not authorized to access this route" });
			}

			console.log("Verify JWT Token Data Values ==>", decoded);
			req.user = decoded.UserInfo;
			req.roles = decoded.UserInfo.roles;
			req.organizationId = decoded.organizationId;

			next();
		}
	);
};

// verify that it is an employee only
const verifyEmployeeJWT = (req, res, next) => {
	const token = req.cookies.accessToken;
	if (!token) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}
	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			if (err) {
				console.log(err);
				return res.status(403).json({ message: "Forbidden" });
			}

			// Check if the role is employee
			if (!decoded.UserInfo.roles.includes("employee")) {
				return res
					.status(403)
					.json({ message: "Not authorized to access this route" });
			}
			console.log("Verify JWT Token Data Values ==>", decoded);
			req.user = decoded.UserInfo;
			req.roles = decoded.UserInfo.roles;
			req.organizationId = decoded.organizationId;

			next();
		}
	);
};

module.exports = {
	verifyJWT,
	verifyTemporaryToken,
	verifyOrganizationJWT,
	verifyAdminJWT,
	verifyEmployeeJWT,
};
