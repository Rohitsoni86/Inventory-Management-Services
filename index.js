const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
dotenv.config();
const apiRoutes = require("./routes/api.routes");
const router = require("./routes/api.routes");

const app = express();
app.use(express.json());
// Cookie parser
app.use(cookieParser());

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
			},
		},
		hsts: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true,
		},
		noSniff: true,
		xssFilter: true,
		cacheControl: {
			noCache: true,
			noStore: true,
			mustRevalidate: true,
		},
	})
);

const corsOptions = {
	origin: [
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:4000",
	],
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With",
		"R-Token",
		"Accept",
		"Origin",
	],
	credentials: true,
	optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

morgan.token("reqBody", (req, res) => {
	try {
		return JSON.parse(req.body);
	} catch (error) {
		return req.body;
	}
});

morgan.token("resBody", (req, res) => {
	try {
		return JSON.parse(res.locals.responseBody);
	} catch (error) {
		return res.locals.responseBody;
	}
});

morgan.token("request-headers", (req, res) => {
	try {
		return JSON.parse(req.headers);
	} catch (error) {
		return req.headers;
	}
});

const logFormat = (tokens, req, res) => {
	const statusValue = tokens.status(req, res);
	let statusString = `${statusValue} ❌`;
	if (statusValue === "200" || statusValue === "201" || statusValue === "202") {
		statusString = `${statusValue} 🟢`;
	}
	return JSON.stringify(
		{
			date: tokens.date(req, res, "iso"),
			method: tokens.method(req, res),
			url: tokens.url(req, res),
			status: statusString,
			contentLength: tokens.res(req, res, "content-length"),
			requestHeaders: tokens["request-headers"](req, res),
			responseTime: `${tokens["response-time"](req, res)} ms`,
			requestBody: tokens["reqBody"](req),
			responseBody: tokens["resBody"](req, res),
			// _s: "——————————————————————————————————————————————————————————————————————————————————————————————————————————",
		},
		null,
		2
	).replace(/\\/g, "");
};
app.use(morgan(logFormat, { stream: process.stdout }));

const startServer = async () => {
	try {
		await connectDB();

		// Start the server
		const PORT = process.env.USER_SVC_PORT || 4000;
		app.listen(PORT, () => {
			console.log(`Server is running on ${PORT}`);
		});
	} catch (error) {
		console.error("Unable to connect to the database:", error);
	}
};

startServer();

app.use("/api/v1", apiRoutes);

// app.use((req, res, next) => {
// 	res.status(404).json({ message: "Route not found" });
// });

// app.use((err, req, res, next) => {
// 	console.error(err.stack);
// 	res.status(500).json({ message: "Internal Server Error" });
// });
