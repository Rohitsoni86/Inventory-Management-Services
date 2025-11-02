const moment = require("moment-timezone");

const timezonePlugin = (schema) => {
	// Define virtual for createdAt in IST
	schema.virtual("createdAtIST").get(function () {
		return this.createdAt
			? moment(this.createdAt).tz("Asia/Kolkata").format()
			: null;
	});

	// Define virtual for updatedAt in IST
	schema.virtual("updatedAtIST").get(function () {
		return this.updatedAt
			? moment(this.updatedAt).tz("Asia/Kolkata").format()
			: null;
	});

	schema.set("toJSON", { virtuals: true });
	schema.set("toObject", { virtuals: true });
};

module.exports = timezonePlugin;
