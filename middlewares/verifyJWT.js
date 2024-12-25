const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");

// Super Admin

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
		process.env.SUP_ADMIN_ACCESS_TOKEN_SECRET,
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
		process.env.SUP_ADMIN_ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			console.log(err);
			if (err) return res.status(403).json({ message: "Forbidden" });
			req.user = decoded;
			next();
		}
	);
};

const verifyUserTemporaryToken = (req, res, next) => {
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

// Other Users
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
			// if(subDomain && (subDomain !== decoded.UserInfo.tname)) return res.status(403).json({ message: "Forbidden" });
			req.user = decoded.UserInfo;
			req.roles = decoded.UserInfo.roles;
			next();
		}
	);
};

module.exports = {
	verifyJWT,
	verifyTemporaryToken,
	verifyOrganizationJWT,
	verifyUserTemporaryToken,
};
