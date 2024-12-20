const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");

const verifyJWT = (req, res, next) => {
	// const authHeader = req.headers.authorization || req.headers.Authorization;

	// if (!authHeader?.startsWith("Bearer ")) {
	//   return next(new ErrorResponse("Not authorized to access this route", 401));
	// }

	const token = req.cookies.accessToken;
	if (!token) {
		return next(new ErrorResponse("Not authorized to access this route", 401));
	}
	// const token = authHeader.split(" ")[1];

	console.log("Verifying Token", { token, accessToken });

	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		{ algorithms: ["HS256"] },
		(err, decoded) => {
			if (err) return res.status(403).json({ message: "Forbidden" });
			req.user = decoded.UserInfo;
			req.roles = decoded.UserInfo.roles;
			next();
		}
	);
};

module.exports = verifyJWT;
