const mongoose = require("mongoose");

const advanceResults =
	(
		schema,
		modelName,
		{ searchFields = [], populate, selectableFields = "" } = {}
	) =>
	async (req, res, next) => {
		let query;

		// Copy req.query
		const reqQuery = { ...req.query };

		// Fields to exclude
		const removeFields = ["select", "sort", "page", "limit", "search"];

		// Loop over removeFields and delete them from reqQuery
		removeFields.forEach((param) => delete reqQuery[param]);

		// Create query string
		let queryStr = JSON.stringify(reqQuery);

		// Create operators ($gt, $gte, etc)
		queryStr = queryStr.replace(
			/\b(gt|gte|lt|lte|in|eq|ne)\b/g,
			(match) => `$${match}`
		);

		// Finding resource
		// Check if model is already registered
		const model =
			mongoose.models[modelName] || mongoose.model(modelName, schema);
		let parsedQuery = JSON.parse(queryStr);

		if (req.query.search && searchFields.length > 0) {
			let search = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			let searchQuery = new RegExp(search, "i");

			parsedQuery.$or = searchFields.map((field) => ({
				[field]: searchQuery,
			}));
		}

		// Fetch only those requests that are created for user
		if (modelName === "ApprovalRequest") {
			console.log("user", req.user);
			parsedQuery["requestSendTo.id"] = req.user.id;
		}

		// Automatically filter by organization if organizationId is on the request and the model has an 'organizations' field.
		if (req.organizationId && model.schema.path("organizations")) {
			parsedQuery.organizations = req.organizationId;

			console.log("Filtering by organizationId:", req.organizationId);
		}

		query = model.find(parsedQuery);
		const total = await model.countDocuments(parsedQuery);

		// Select Fields
		const fieldsToSelect = req.query.select || selectableFields;
		if (fieldsToSelect) {
			// Ensure fields are space-separated for Mongoose's select()
			let fields =
				typeof fieldsToSelect === "string"
					? fieldsToSelect.replace(/,/g, " ")
					: "";
			// Always include `_id` even if explicitly excluded by the client or forgot to exclude.
			if (fields.includes("-_id")) {
				fields += " _id";
			}
			if (fields) query = query.select(fields);
		}

		// Sort
		if (req.query.sort) {
			const sortBy = req.query.sort.split(",").join(" ");
			query = query.sort(sortBy);
		} else {
			query = query.sort("-createdAt");
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 25;
		const startIndex = (page - 1) * limit;
		const endIndex = page * limit;

		query = query.skip(startIndex).limit(limit);

		if (populate) {
			if (Array.isArray(populate)) {
				populate.forEach((field) => {
					query = query.populate(field);
				});
			} else {
				query = query.populate(populate);
			}
		}

		// Executing query
		const results = await query;

		// Pagination result
		const pagination = {};

		if (endIndex < total) {
			pagination.next = {
				page: page + 1,
				limit,
				totalPages: Math.ceil(total / limit),
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
				totalPages: Math.ceil(total / limit),
			};
		}

		res.advanceResults = {
			success: true,
			total,
			count: results.length,
			pagination,
			data: results,
		};

		next();
	};

module.exports = advanceResults;
