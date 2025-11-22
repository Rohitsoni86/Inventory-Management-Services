const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { AttributeModel: Attribute } = require("../models/attributeModel");
const createAttributesForOrgFromGroupedFile = require("../utils/createAtrributesMasters");

// Utility: get orgId from request (adjust to your auth)
function getOrgIdFromReq(req) {
	// Prefer explicit query param only for admin scripts; normally use authenticated org from JWT/middleware
	return (
		req.organizationId ||
		(req.user && req.user.organizations && req.user.organizations[0]) ||
		req.query.organizationId
	);
}

/**
 * GET /get/attributes
 * Query params:
 *  - storeType (optional)
 *  - productType (optional)
 *  - key (optional)
 *  - q (search term on label or key)
 */
const getAllAttributes = asyncHandler(async (req, res) => {
	try {
		res.status(200).json({
			...res.advanceResults,
		});
	} catch (error) {
		next(new ErrorResponse(error.message), 500);
	}
});

/**
 * GET /list/attributes
 * Query params:
 *  - storeType (optional)
 *  - productType (optional)
 *  - key (optional)
 *  - q (search term on label or key)
 */
const listAttributes = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });

	const {
		storeType = "all",
		productType,
		key,
		q,
		page = 1,
		limit = 200,
	} = req.query;
	const skip = (Math.max(1, parseInt(page, 10)) - 1) * limit;

	const filter = { organizationId };

	// match attributes declared for 'all' or this storeType or missing storeTypes
	filter.$or = [
		{ storeTypes: { $exists: false } },
		{ storeTypes: { $in: ["all", storeType] } },
	];

	if (productType) filter.productTypes = { $in: [productType] };
	if (key) filter.key = key;
	if (q) filter.$text = { $search: q }; // requires text index on label/key or you can use regex

	// Basic pagination and sort
	const [items, total] = await Promise.all([
		Attribute.find(filter)
			.sort({ order: 1, key: 1 })
			.skip(skip)
			.limit(parseInt(limit, 10))
			.lean(),
		Attribute.countDocuments(filter),
	]);

	res.status(200).json({ success: true, data: items, total });
});

/**
 * GET /get/attribute/:id
 */
const getAttribute = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	const { id } = req.params;
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });

	const doc = await Attribute.findOne({ _id: id, organizationId }).lean();
	if (!doc)
		return res
			.status(404)
			.json({ success: false, message: "Attribute not found" });

	res.status(200).json({ success: true, data: doc });
});

/**
 * POST /create/attribute
 * Body: attribute object
 */
const createAttribute = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });

	const payload = {
		organizationId,
		key: req.body.key,
		label: req.body.label || req.body.key,
		inputType: req.body.inputType,
		dataType: req.body.dataType || "string",
		options: req.body.options || [],
		storeTypes: req.body.storeTypes || ["all"],
		productTypes: req.body.productTypes || [
			"standard",
			"variable",
			"batch",
			"serialized",
			"service",
			"bundle",
		],
		isVariantAxis: !!req.body.isVariantAxis,
		requiredOnStockEntry: !!req.body.requiredOnStockEntry,
		validation: req.body.validation || {},
		helpText: req.body.helpText || "",
		order: typeof req.body.order === "number" ? req.body.order : 100,
		createdBy: req.user ? req.user._id : null,
	};

	// Basic validation
	if (!payload.key || !payload.inputType) {
		return res
			.status(400)
			.json({ success: false, message: "key and inputType are required" });
	}

	try {
		const created = await Attribute.create([payload]);
		res.status(201).json({ success: true, data: created[0] });
	} catch (err) {
		// likely duplicate key
		return res.status(400).json({ success: false, message: err.message });
	}
});

/**
 * PUT /update/attribute/:id
 */
const updateAttribute = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	const { id } = req.params;
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });

	const toUpdate = { ...req.body };
	// prevent changing organizationId or key accidentally? allow key change if you want
	delete toUpdate.organizationId;

	const updated = await Attribute.findOneAndUpdate(
		{ _id: id, organizationId },
		{ $set: toUpdate },
		{ new: true }
	);
	if (!updated)
		return res
			.status(404)
			.json({ success: false, message: "Attribute not found" });

	res.status(200).json({ success: true, data: updated });
});

/**
 * DELETE /delete/attribute/:id
 */
const deleteAttribute = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	const { id } = req.params;
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });

	const removed = await Attribute.findOneAndDelete({ _id: id, organizationId });
	if (!removed)
		return res
			.status(404)
			.json({ success: false, message: "Attribute not found" });

	res.status(200).json({ success: true, message: "Attribute deleted" });
});

/**
 * POST /attribute/bulk-upsert
 * Body: { attributes: [ ... ], upsert: true/false }
 *
 * Useful to push many attributes at once (edit store type attributes)
 */
const bulkUpsertAttributes = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	const { attributes = [], upsert = true } = req.body;
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });
	if (!Array.isArray(attributes))
		return res
			.status(400)
			.json({ success: false, message: "attributes must be array" });

	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		let count = 0;
		for (const attr of attributes) {
			const doc = {
				organizationId,
				key: attr.key,
				label: attr.label || attr.key,
				inputType: attr.inputType,
				dataType: attr.dataType || "string",
				options: attr.options || [],
				storeTypes: attr.storeTypes || ["all"],
				productTypes: attr.productTypes || [
					"standard",
					"variable",
					"batch",
					"serialized",
					"service",
					"bundle",
				],
				isVariantAxis: !!attr.isVariantAxis,
				requiredOnStockEntry: !!attr.requiredOnStockEntry,
				validation: attr.validation || {},
				helpText: attr.helpText || "",
				order: typeof attr.order === "number" ? attr.order : 100,
				createdBy: req.user ? req.user._id : null,
			};

			if (upsert) {
				await Attribute.updateOne(
					{ organizationId, key: doc.key },
					{
						$setOnInsert: doc,
						$set: {
							label: doc.label,
							inputType: doc.inputType,
							options: doc.options,
							productTypes: doc.productTypes,
							isVariantAxis: doc.isVariantAxis,
							requiredOnStockEntry: doc.requiredOnStockEntry,
							validation: doc.validation,
							helpText: doc.helpText,
							order: doc.order,
						},
					},
					{ upsert: true, session }
				);
			} else {
				await Attribute.create([doc], { session });
			}
			count++;
		}

		await session.commitTransaction();
		session.endSession();
		res
			.status(200)
			.json({ success: true, message: "Bulk upsert complete", count });
	} catch (err) {
		await session.abortTransaction();
		session.endSession();
		res.status(500).json({ success: false, message: err.message });
	}
});

/**
 * POST /attribute/apply-store-seed
 * Body: { storeType: 'automobile' }
 * This will call your file-based seed helper and apply the seed for the org with session.
 */
const applyStoreSeed = asyncHandler(async (req, res) => {
	const organizationId = getOrgIdFromReq(req);
	const { id: createdBy } = req.user;
	const { storeType } = req.body;
	if (!organizationId)
		return res
			.status(400)
			.json({ success: false, message: "organizationId required" });
	if (!storeType)
		return res
			.status(400)
			.json({ success: false, message: "storeType required" });

	// Try to use a transaction if possible
	let session;
	try {
		session = await mongoose.startSession();
		// If startSession succeeds but transaction is not supported, commitTransaction will throw or Mongo will error on startTransaction
		session.startTransaction();

		const orgDoc = { _id: organizationId };
		const result = await createAttributesForOrgFromGroupedFile(
			storeType,
			orgDoc,
			session,
			createdBy,
			{ upsert: true }
		);

		await session.commitTransaction();
		session.endSession();

		return res.status(200).json({
			success: true,
			message: "Applied store seed (transactional)",
			result,
		});
	} catch (err) {
		// If we have a session, abort and end it
		try {
			if (session) {
				try {
					await session.abortTransaction();
				} catch (e) {
					/* ignore */
				}
				try {
					session.endSession();
				} catch (e) {
					/* ignore */
				}
			}
		} catch (e) {
			/* ignore */
		}

		// Check for the typical "transaction numbers" error (standalone mongod) or other unsupported transaction errors
		const isTxnNotSupported =
			err &&
			((err.message &&
				err.message.includes("Transaction numbers are only allowed")) ||
				// older messages or different message text
				(err.message && err.message.includes("not support retryable writes")) ||
				(err.name === "MongoError" && String(err.code) === "20")); // example checks (server error codes vary)

		if (isTxnNotSupported) {
			// Fallback to non-transactional upserts (safe for seeding; helper will upsert)
			try {
				const orgDoc = { _id: organizationId };
				const result = await createAttributesForOrgFromGroupedFile(
					storeType,
					orgDoc,
					null,
					createdBy,
					{ upsert: true }
				);
				return res.status(200).json({
					success: true,
					message: "Applied store seed (non-transactional fallback)",
					result,
					warning:
						"Transaction not supported on this MongoDB deployment; used non-transactional upserts.",
				});
			} catch (err2) {
				return res.status(500).json({
					success: false,
					message: err2.message || "Failed to apply store seed (fallback)",
				});
			}
		}

		// Otherwise return the original error
		return res.status(500).json({
			success: false,
			message: err.message || "Failed to apply store seed",
		});
	}
});

module.exports = {
	listAttributes,
	getAttribute,
	createAttribute,
	updateAttribute,
	deleteAttribute,
	bulkUpsertAttributes,
	applyStoreSeed,
	getAllAttributes,
};
