const mongoose = require("mongoose");

const AttributeSchema = new mongoose.Schema({
	organizationId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organization",
		required: true,
		index: true,
	},

	key: { type: String, required: true },
	label: { type: String, required: true },

	inputType: {
		type: String,
		required: true,
		enum: [
			"text",
			"number",
			"select",
			"multiselect",
			"boolean",
			"date",
			"textarea",
			"dimensions",
			"numberWithUnit",
			"tags",
			"file",
		],
	},

	dataType: {
		type: String,
		required: true,
		enum: ["string", "number", "boolean", "date", "object", "array"],
	},

	// For select/multiselect: array of option values or objects {value,label}
	options: { type: Array, default: [] },

	// Which storeTypes this attribute applies to (e.g., ['automobile','supermarket','all'])
	storeTypes: { type: [String], default: ["all"] },

	// Which product types it commonly applies to (standard, variable, batch, serialized, service, bundle)
	productTypes: {
		type: [String],
		default: [
			"standard",
			"variable",
			"batch",
			"serialized",
			"service",
			"bundle",
		],
	},

	// Can this attribute be used as a variant axis for variable products?
	isVariantAxis: { type: Boolean, default: false },

	// If true, this attribute must be captured at stock-receive time (e.g., batchCode, expiryDate)
	requiredOnStockEntry: { type: Boolean, default: false },

	// Validation rules (min,max,step,regex,required)
	validation: {
		required: { type: Boolean, default: false },
		min: { type: Number, default: null },
		max: { type: Number, default: null },
		step: { type: Number, default: null },
		regex: { type: String, default: null },
		maxLength: { type: Number, default: null },
	},

	helpText: { type: String, default: "" },

	order: { type: Number, default: 100 },

	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null,
	},
	createdAt: { type: Date, default: Date.now },
});

// prevent duplicate key per org
AttributeSchema.index({ organizationId: 1, key: 1 }, { unique: true });

const AttributeModel = mongoose.model("Attribute", AttributeSchema);

module.exports = { AttributeModel, AttributeSchema };
