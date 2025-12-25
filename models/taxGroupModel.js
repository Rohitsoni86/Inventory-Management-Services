const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment-timezone");

const IST_DATE_FORMAT = "YYYY-MM-DD";

const taxGroupSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			// unique: true,
			minlength: 2,
			maxlength: 50,
		},
		taxRates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tax" }],
		totalTaxRate: {
			type: Number,
			required: true,
			min: 0,
			max: 100,
		},
		description: {
			type: String,
			trim: true,
			maxlength: 200,
		},
		effectiveFrom: {
			type: String, // Treat as a string on the input/output layer
			required: true,

			// --- INPUT (Setter) ---
			set: function (istTimeString) {
				if (!istTimeString) return;

				// 1. Parse the incoming IST string using moment-timezone
				const istMoment = moment.tz(
					istTimeString,
					IST_DATE_FORMAT,
					"Asia/Kolkata"
				);

				if (!istMoment.isValid()) {
					// Throw a validation error if the format is incorrect
					throw new Error(
						`Invalid date format for effectiveFrom. Expected format: ${IST_DATE_FORMAT}`
					);
				}

				// 2. Set the internal, hidden Date field to the UTC Date object
				this._effectiveFrom = istMoment.toDate();

				// 3. Return the original string (or a validated one) to the outer 'effectiveFrom' property
				return istTimeString;
			},

			// --- OUTPUT (Getter) ---
			get: function (istTimeString) {
				// When reading, use the stored UTC date to generate the formatted string
				if (this._effectiveFrom) {
					return moment(this._effectiveFrom)
						.tz("Asia/Kolkata")
						.format(IST_DATE_FORMAT);
				}
				return istTimeString;
			},
		},
		status: { type: String, enum: ["active", "inactive"], default: "active" },
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true,
		toJSON: { getters: true, virtuals: true },
		toObject: { getters: true, virtuals: true },
	}
);

// Add a pre-save hook to ensure the internal date is considered for validation
taxGroupSchema.pre("validate", function (next) {
	if (this.effectiveFrom && !this._effectiveFrom) {
		// This handles cases where the setter fails or bypasses,
		// ensuring the internal date is present before saving.
		return next(
			new Error("effectiveFrom field could not be parsed into a valid date.")
		);
	}
	next();
});

const TaxGroup = mongoose.model("TaxGroup", taxGroupSchema);

module.exports = { taxGroupSchema, TaxGroup };
