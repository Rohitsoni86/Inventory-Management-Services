const mongoose = require("mongoose");
const productsSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		category: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		brand: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		code: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		description: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		type: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		cost: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		price: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		unit: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		saleUnit: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		purchaseUnit: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		quantity: {
			type: String,
			required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		imageUrl: {
			type: String,
			required: false,
			trim: true,
		},
		countryCode: {
			type: String,
			required: true,
			validate: {
				validator: function (v) {
					return /^\+?[1-9]\d{1,14}$/.test(v); // Validate international phone number format
				},
				message: "Invalid country code format",
			},
			default: "IN",
		},
		sku: {
			type: String,
			// required: true,
			unique: true,
			trim: true,
		},
		model: {
			type: String,
			// required: true,
			trim: true,
			minlength: 2,
			maxlength: 50,
		},
		yearOfManufacture: {
			type: Number,
			// required: true,
		},
		dimensions: {
			type: Object,
			required: false,
			properties: {
				length: { type: Number },
				width: { type: Number },
				height: { type: Number },
				weight: { type: Number },
			},
		},
		color: {
			type: String,
			trim: true,
		},
		warranty: {
			type: Number,
			trim: true,
		},
		availabilityStatus: {
			type: String,
			enum: ["in stock", "out of stock", "discontinued"],
			default: "in stock",
		},
		supplier: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Supplier",
			},
		],
		compatibleVehicles: [
			{
				type: String,
				// enum: ["Sedan", "SUV", "Truck", "Motorcycle","Bike"],
			},
		],
		discount: {
			type: Number, // Percentage or fixed amount
			min: 0,
			max: 100,
			default: 0,
		},
		ratings: {
			type: Number,
			min: 0,
			max: 10,
		},
		barcode: {
			type: String,
			trim: true,
		},
		createdAt: {
			type: Date,
		},
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
		],
	},
	{
		timestamps: true,
	}
);

const ProductsModel = mongoose.model("Products", productsSchema);

module.exports = ProductsModel;

// {
//   "name": "Premium Car Battery",
//   "category": "Auto Parts",
//   "brand": "Duracell",
//   "code": "DC12345",
//   "description": "High-performance car battery with extended lifespan for all vehicle types.",
//   "type": "Battery",
//   "cost": "120.00",
//   "price": "180.00",
//   "unit": "Piece",
//   "saleUnit": "Piece",
//   "purchaseUnit": "Piece",
//   "quantity": "50",
//   "imageUrl": "https://example.com/images/premium-car-battery.jpg",
//   "countryCode": "+1",
//   "createdAt": "2024-12-26T10:00:00Z",
//   "organizations": ["6012a0b5c2b6c9e8b3a15e0f"],
//   "sku": "DC12345",
//   "model": "DC-2024",
//   "year": 2024,
//   "dimensions": {
//     "length": 30,
//     "width": 15,
//     "height": 20,
//     "weight": 15
//   },
//   "color": "Black",
//   "warranty": "5 years",
//   "availabilityStatus": "in stock",
//   "supplier": "6012a0b5c2b6c9e8b3a15e10",
//   "compatibleVehicles": ["Sedan", "SUV", "Truck"],
//   "discount": 10,
//   "barcode": "123456789012",
//   "shippingCost": 10.00,
//   "ratings": [5, 4, 5, 5],
//   "averageRating": 4.75
// }

// {
//   "name": "LED Headlight Assembly",
//   "category": "Auto Parts",
//   "brand": "Philips",
//   "code": "PHL12345",
//   "description": "High-performance LED headlight assembly for better visibility and longer lifespan.",
//   "type": "Headlight",
//   "cost": "80.00",
//   "price": "120.00",
//   "unit": "Piece",
//   "saleUnit": "Piece",
//   "purchaseUnit": "Piece",
//   "quantity": "200",
//   "imageUrl": "https://example.com/images/led-headlight.jpg",
//   "countryCode": "+1",
//   "createdAt": "2024-12-26T10:00:00Z",
//   "organizations": ["6012a0b5c2b6c9e8b3a15e0f"],
//   "sku": "PHL12345",
//   "model": "HL-2024",
//   "year": 2024,
//   "dimensions": {
//     "length": 25,
//     "width": 10,
//     "height": 12,
//     "weight": 1.5
//   },
//   "color": "White",
//   "warranty": "3 years",
//   "availabilityStatus": "in stock",
//   "supplier": "6012a0b5c2b6c9e8b3a15e10",
//   "compatibleVehicles": ["Sedan", "SUV", "Truck"],
//   "discount": 15,
//   "barcode": "987654321098",
//   "shippingCost": 15.00,
//   "ratings": [5, 4, 5, 4, 5],
//   "averageRating": 4.6
// }
