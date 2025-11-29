const mongoose = require("mongoose");
const { MeasuringUnit } = require("../models/measuringUnitsModel");
const ErrorResponse = require("./errorResponse");
const { Schema } = mongoose;

/**
 * Convert a quantity from a given unit to the product's base unit.
 * Assumes:
 *   unit.multiplierToBase = how many base units are in ONE of this unit.
 *   e.g. if base is litre:
 *        L:  multiplierToBase = 1
 *        ml: multiplierToBase = 0.001 (because 1 ml = 0.001 L)
 */
async function convertToBaseUnit(quantity, saleUnitId, baseUnitId) {
	if (!quantity || quantity <= 0) {
		throw new ErrorResponse("Quantity must be greater than 0", 400);
	}

	if (String(saleUnitId) === String(baseUnitId)) {
		return quantity;
	}

	const [saleUnit, baseUnit] = await Promise.all([
		MeasuringUnit.findById(saleUnitId),
		MeasuringUnit.findById(baseUnitId),
	]);

	if (!saleUnit || !baseUnit) {
		throw new ErrorResponse("Invalid unit configuration", 400);
	}

	if (
		!saleUnit.family ||
		!baseUnit.family ||
		String(saleUnit.family) !== String(baseUnit.family)
	) {
		throw new ErrorResponse("Incompatible units for this product", 400);
	}

	// Because multiplierToBase already expresses in base units:
	//    qBase = q * multiplierToBase
	const qBase = quantity * Number(saleUnit.multiplierToBase || 1);
	return qBase;
}

module.exports = { convertToBaseUnit };
