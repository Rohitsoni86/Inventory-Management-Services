const path = require("path");
const fs = require("fs").promises;
const { AttributeModel: Attribute } = require("../models/attributeModel");

async function createAttributesForOrgFromGroupedFile(
	storeType,
	orgDoc,
	session = null,
	createdBy = null,
	opts = { upsert: true }
) {
	const filePath = path.join(__dirname, "..", "attributesMasters.json");
	let raw;
	try {
		raw = await fs.readFile(filePath, "utf8");
	} catch (err) {
		throw new Error(`Seed attributes file not found at ${filePath}`);
	}

	let grouped;
	try {
		grouped = JSON.parse(raw);
	} catch (err) {
		throw new Error(`Invalid JSON in seed file: ${err.message}`);
	}

	// Build merged list: start with common (if present), then add storeType-specific (if present).
	const common = Array.isArray(grouped.common) ? grouped.common : [];
	const specific = Array.isArray(grouped[storeType]) ? grouped[storeType] : [];
	// Merge while deduping by key - prefer common's entry if key exists in both
	const mergedMap = new Map();

	// add common first
	for (const attr of common) {
		if (!attr.key) continue;
		mergedMap.set(attr.key, attr);
	}
	// add specific next (only if key not present)
	for (const attr of specific) {
		if (!attr.key) continue;
		if (!mergedMap.has(attr.key)) mergedMap.set(attr.key, attr);
	}

	// If you want other store types included (e.g., 'general' always), you can optionally merge 'general' too
	// Merge 'general' (if present) but do not override existing keys
	if (Array.isArray(grouped.general)) {
		for (const attr of grouped.general) {
			if (!attr.key) continue;
			if (!mergedMap.has(attr.key)) mergedMap.set(attr.key, attr);
		}
	}

	const merged = Array.from(mergedMap.values());

	const orgId = orgDoc._id;
	let createdCount = 0;
	const now = new Date();

	for (const attr of merged) {
		const insertOnly = {
			organizationId: orgId,
			key: attr.key,
			createdBy: createdBy,
			createdAt: now,
		};

		const setFields = {
			label: attr.label || attr.key,
			inputType: attr.inputType,
			dataType: attr.dataType || "string",
			options: attr.options || [],
			storeTypes: attr.storeTypes || ["all", storeType],
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
		};

		if (opts.upsert) {
			const updateOptions = session
				? { upsert: true, session }
				: { upsert: true };
			await Attribute.updateOne(
				{ organizationId: orgId, key: attr.key },
				{ $setOnInsert: insertOnly, $set: setFields },
				updateOptions
			);
		} else {
			const doc = { ...insertOnly, ...setFields };
			if (session) {
				await Attribute.create([doc], { session });
			} else {
				await Attribute.create([doc]);
			}
		}
		createdCount++;
	}

	// for (const attr of merged) {
	// 	const doc = {
	// 		organizationId: orgId,
	// 		key: attr.key,
	// 		label: attr.label || attr.key,
	// 		inputType: attr.inputType,
	// 		dataType: attr.dataType || "string",
	// 		options: attr.options || [],
	// 		storeTypes: attr.storeTypes || ["all", storeType],
	// 		productTypes: attr.productTypes || [
	// 			"standard",
	// 			"variable",
	// 			"batch",
	// 			"serialized",
	// 			"service",
	// 			"bundle",
	// 		],
	// 		isVariantAxis: !!attr.isVariantAxis,
	// 		requiredOnStockEntry: !!attr.requiredOnStockEntry,
	// 		validation: attr.validation || {},
	// 		helpText: attr.helpText || "",
	// 		order: typeof attr.order === "number" ? attr.order : 100,
	// 		createdBy: null,
	// 	};

	// 	if (opts.upsert) {
	// 		// // Upsert (do not overwrite existing key), but update label/options/order if desired:
	// 		// await Attribute.updateOne(
	// 		// 	{ organizationId: orgId, key: attr.key },
	// 		// 	{
	// 		// 		$setOnInsert: doc,
	// 		// 		$set: {
	// 		// 			label: doc.label,
	// 		// 			inputType: doc.inputType,
	// 		// 			dataType: doc.dataType,
	// 		// 			options: doc.options,
	// 		// 			productTypes: doc.productTypes,
	// 		// 			isVariantAxis: doc.isVariantAxis,
	// 		// 			requiredOnStockEntry: doc.requiredOnStockEntry,
	// 		// 			validation: doc.validation,
	// 		// 			helpText: doc.helpText,
	// 		// 			order: doc.order,
	// 		// 		},
	// 		// 	},
	// 		// 	{ upsert: true, session }
	// 		// );
	// 		// createdCount++;
	// 		// Use session only if provided
	// 		const updateOptions = session
	// 			? { upsert: true, session }
	// 			: { upsert: true };
	// 		await Attribute.updateOne(
	// 			{ organizationId: orgId, key: attr.key },
	// 			{
	// 				$setOnInsert: doc,
	// 				$set: {
	// 					label: doc.label,
	// 					inputType: doc.inputType,
	// 					dataType: doc.dataType,
	// 					options: doc.options,
	// 					productTypes: doc.productTypes,
	// 					isVariantAxis: doc.isVariantAxis,
	// 					requiredOnStockEntry: doc.requiredOnStockEntry,
	// 					validation: doc.validation,
	// 					helpText: doc.helpText,
	// 					order: doc.order,
	// 				},
	// 			},
	// 			updateOptions
	// 		);
	// 		createdCount++;
	// 	} else {
	// 		// await Attribute.create([doc], { session });
	// 		// createdCount++;
	// 		// create() supports session as option
	// 		if (session) {
	// 			await Attribute.create([doc], { session });
	// 		} else {
	// 			await Attribute.create([doc]);
	// 		}
	// 		createdCount++;
	// 	}
	// }

	return { created: createdCount, installed: merged.length };
}

module.exports = createAttributesForOrgFromGroupedFile;
