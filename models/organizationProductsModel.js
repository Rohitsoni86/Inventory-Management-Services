const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductSchema = new Schema(
	{
		organizationId: {
			type: Schema.Types.ObjectId,
			ref: "Organization",
			required: true,
			index: true,
		},

		// basic
		name: { type: String, required: true, trim: true },
		sku: { type: String, trim: true },
		code: { type: String, trim: true },
		description: { type: String },

		// relations
		category: { type: Schema.Types.ObjectId, ref: "Category" },
		brand: { type: Schema.Types.ObjectId, ref: "Brand" },
		baseUnit: { type: Schema.Types.ObjectId, ref: "Unit" }, // official unit
		saleUnit: [{ type: Schema.Types.ObjectId, ref: "Unit" }],
		purchaseUnit: { type: Schema.Types.ObjectId, ref: "Unit" },
		hasExpiryDate: { type: Boolean, default: false },
		// product type + flags (persisted so product behaviour stays stable)
		productType: { type: String },
		productTypeCode: { type: String },
		allowBundling: { type: Boolean, default: false },
		allowFractionalQty: { type: Boolean, default: false },
		hasVariants: { type: Boolean, default: false },
		trackInventory: { type: Boolean, default: true },
		trackBatches: { type: Boolean, default: false },
		trackSerials: { type: Boolean, default: false },
		productAvailability: { type: String, default: "inStock" },
		// prices/cost
		totalQuantity: { type: Number, default: 0 },
		avgCostPrice: { type: Number, default: 0 },

		reorderPoint: { type: Number, default: 0 },
		reorderQty: { type: Number, default: 0 },

		expiryDate: { type: Date }, // for standard products only backup
		taxRate: { type: Number, default: 0 }, // for standard products only backup
		sellPrice: { type: Number, default: 0 }, // for standard products only backup

		// dynamic attributes
		selectedAttributeKeys: { type: [String], default: [] },
		attributes: { type: Schema.Types.Mixed, default: {} }, // flexible key-value mapping

		// images (store urls or file refs)
		frontImageUrl: { type: String, default: "" },
		backImageUrl: { type: String, default: "" },
		frontImageType: { type: String },
		backImageType: { type: String },

		createdBy: { type: Schema.Types.ObjectId, ref: "User" },
		updatedBy: { type: Schema.Types.ObjectId, ref: "User" },

		active: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

// Unique constraints per organization: SKU or code unique per organization
ProductSchema.index(
	{ organizationId: 1, sku: 1 },
	{ unique: true, sparse: true }
);

// Optional: if you need to search by some attribute often (example size), create a sparse index:
// ProductSchema.index({ "attributes.size": 1, organizationId: 1 });

const ProductModel = mongoose.model("Product", ProductSchema);

module.exports = { ProductSchema, ProductModel };

// const ProductsModel = mongoose.model("Products", productsSchema);

// module.exports = ProductsModel;

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

// Schema.Types.Mixed (attributes) allows any shape. Use it because attributes are dynamic.

// We created unique indexes scoped to organizationId for sku and code. Use sparse so they don't block missing values.

// If you require attribute search by particular keys frequently, add specific indexes like attributes.color.
