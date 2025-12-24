# Unit and Unit Family Management Guide

This guide provides a step-by-step explanation of how to manage and use units and unit families within the inventory management system.

## 1. Introduction

The unit management system is designed to provide flexibility in managing products that are bought and sold in different units of measurement. It allows you to maintain a standardized inventory count while accommodating various purchasing and selling units.

The system is based on two core concepts:

- **Unit Families**: Groups of related units of measurement (e.g., Weight, Length, Volume).
- **Units**: Individual units of measurement within a family (e.g., Gram, Kilogram, Pound within the Weight family).

The key to the system is the `multiplierToBase` property, which defines the conversion factor between a unit and the base unit of its family.

## 2. Unit Families

Unit families are the foundation of the unit management system. They group related units together, enabling conversions between them.

### Creating a Unit Family

To create a unit family, you need to provide a name for the family.

**API Endpoint:** `POST /api/v1/admin/unit-family`

**Request Body:**

```json
{
	"name": "Weight"
}
```

This will create a new unit family named "Weight".

## 3. Units

Once you have created a unit family, you can add individual units to it.

### Creating a Unit

To create a unit, you need to provide the following information:

- `name`: The name of the unit (e.g., "Gram").
- `symbol`: The symbol of the unit (e.g., "g").
- `family`: The ID of the unit family it belongs to.
- `isBase`: A boolean value indicating if this is the base unit for the family. Each family must have exactly one base unit.
- `multiplierToBase`: The conversion factor to the base unit. For the base unit itself, this value must be `1`.

**API Endpoint:** `POST /api/v1/admin/unit`

**Request Body (for a base unit):**

```json
{
	"name": "Gram",
	"symbol": "g",
	"family": "<family_id>",
	"isBase": true,
	"multiplierToBase": 1
}
```

**Request Body (for a non-base unit):**

```json
{
	"name": "Kilogram",
	"symbol": "kg",
	"family": "<family_id>",
	"isBase": false,
	"multiplierToBase": 1000
}
```

In this example, 1 Kilogram is equal to 1000 Grams.

Here is an example of a "Weight" unit family:

| Name     | Symbol | isBase | multiplierToBase |
| -------- | ------ | ------ | ---------------- |
| Gram     | g      | true   | 1                |
| Kilogram | kg     | false  | 1000             |
| Pound    | lb     | false  | 453.592          |

## 4. Product Configuration

After setting up your units and unit families, you can associate them with your products.

When creating or updating a product, you can specify the following unit-related fields:

- `baseUnit`: The unit used for inventory tracking. This is a mandatory field.
- `purchaseUnit`: The unit in which the product is typically purchased.
- `saleUnit`: An array of units in which the product can be sold.

**Example Product:**

```json
{
	"name": "Coffee Beans",
	"baseUnit": "<gram_unit_id>",
	"purchaseUnit": "<kilogram_unit_id>",
	"saleUnit": ["<gram_unit_id>", "<kilogram_unit_id>"]
}
```

In this example, the inventory of "Coffee Beans" is tracked in Grams. The product is purchased in Kilograms and can be sold in both Grams and Kilograms.

## 5. Transactional Conversion

The system automatically handles unit conversions during sales and purchases.

When a product is sold or purchased in a unit other than its `baseUnit`, the system uses the `convertToBaseUnit` utility to convert the transaction quantity to the base unit quantity for inventory updates.

The `convertToBaseUnit` function performs the following steps:

1.  It validates that the transaction unit and the product's `baseUnit` belong to the same unit family.
2.  It multiplies the transaction quantity by the `multiplierToBase` of the transaction unit to calculate the equivalent quantity in the `baseUnit`.

### Sales Explanation with Examples

Let's consider a product "Coffee Beans" with the following configuration:

- **`baseUnit`**: Gram (g)
- **Inventory**: 5000g

Now, let's see what happens when a sale is made.

| Sale Unit     | Quantity Sold | Calculation  | Inventory Deduction (in baseUnit) | Remaining Inventory |
| ------------- | ------------- | ------------ | --------------------------------- | ------------------- |
| Gram (g)      | 250           | 250 \* 1     | 250g                              | 4750g               |
| Kilogram (kg) | 2             | 2 \* 1000    | 2000g                             | 2750g               |
| Pound (lb)    | 3             | 3 \* 453.592 | 1360.776g                         | 1389.224g           |

**Example 1: Selling in the Base Unit**

If you sell 250g of "Coffee Beans", the system will deduct 250g from the inventory.

**Example 2: Selling in a Different Unit**

If you sell 2kg of "Coffee Beans", the system will first convert the quantity to the base unit:

`2 kg * 1000 g/kg = 2000g`

Then, it will deduct 2000g from the inventory.

**Example 3: Selling in Another Different Unit**

If you sell 3lb of "Coffee Beans", the system will convert the quantity to the base unit:

`3 lb * 453.592 g/lb = 1360.776g`

The system will then deduct 1360.776g from the inventory.

This ensures that your inventory is always accurate and up-to-date, regardless of the units used in transactions.

<!-- now this is my create sale contoller at backend const createSale = asyncHandler(async (req, res, next) => {
	const organizationId = req.organizationId;
	const userId = req.user.id;

	console.log("✅ Details Passed ===>", req.body);

	if (!organizationId) {
		return next(new ErrorResponse("organizationId missing on request", 400));
	}

	// 1) Validate request
	const { error, value } = createSaleSchema.validate(req.body);
	if (error) {
		return next(new ErrorResponse(error.details[0].message, 400));
	}

	const { invoiceDate, customer: customerData, notes, payment } = value;
	let { mode, paidAmount, transactionId } = payment;
	let { invoiceNumber } = value;
	const linesReq = value.lines;

	console.log(
		"✅ Details Passed 2===>",
		invoiceNumber,
		customerData,
		notes,
		linesReq,
		payment
	);

	// REMOVED: const session = await mongoose.startSession();
	// REMOVED: session.startTransaction();

	try {
		if (!invoiceNumber || invoiceNumber.trim() === "") {
			invoiceNumber = await generateInvoiceNumber(organizationId);
		}

		// Customer Handling
		let customerDoc = null;
		if (customerData) {
			if (typeof customerData === "string") {
				// It's an ID
				customerDoc = await CustomerModel.findById(customerData);
			} else if (typeof customerData === "object") {
				// It's an object with details, find or create
				const {
					honorific,
					gender,
					name,
					countryCode,
					flagCode,
					phoneNo,
					email,
					address,
					city,
					state,
					country,
					postalCode,
				} = customerData;

				// Try to find by phone number & name
				customerDoc = await CustomerModel.findOne({
					name,
					phoneNo,
					organizations: organizationId,
				});

				if (!customerDoc) {
					// Not found, so create a new one
					const customerCode = await generateCustomerCode(organizationId);

					customerDoc = await CustomerModel.create({
						name,
						honorific,
						gender,
						countryCode,
						flagCode,
						phoneNo,
						address,
						city,
						state,
						country,
						postalCode,
						email: email || "",
						customerCode,
						organizations: [organizationId],
						createdBy: userId,
						updatedBy: userId,
					});

					// also add in the organization model new customer
					const organization = await Organization.findById(organizationId);

					organization.customers.push(customerDoc._id);
					await organization.save();
				} else {
					// Update here only name email postalcode city state and address only
					customerDoc.name = name;
					customerDoc.email = email || "";
					customerDoc.postalCode = postalCode || "";
					customerDoc.city = city || "";
					customerDoc.state = state || "";
					customerDoc.address = address || "";
					await customerDoc.save();
					console.log("Updated Details ✅✅", customerDoc);
				}
			}
		}

		const customerId = customerDoc ? customerDoc._id : null;
		const customerName = customerDoc ? customerDoc.name : "Walk-in Customer";
		const customerCode = customerDoc ? customerDoc.customerCode : null;

		const now = invoiceDate ? new Date(invoiceDate) : new Date();

		const salesLines = [];
		let totalGross = 0;
		let totalDiscount = 0;
		let totalTax = 0;
		let totalAmount = 0;
		let totalCost = 0;
		let totalProfit = 0;

		// Process each line
		for (const line of linesReq) {
			const { productId, unitId: saleUnitId, quantity } = line;
			const batchId = line.batchId;
			const serialIds = line.serialNumbers || [];

			// Load product
			const product = await Product.findOne({
				_id: productId,
				organizationId,
				active: true,
			});

			if (!product) {
				throw new ErrorResponse("Product not found or inactive", 404);
			}

			if (!product.baseUnit) {
				throw new ErrorResponse("Product baseUnit is not configured", 400);
			}

			const baseUnitId = product.baseUnit;

			// Convert sale qty to base qty
			const quantityBase = await convertToBaseUnit(
				quantity,
				saleUnitId,
				baseUnitId
			);

			if (quantityBase <= 0) {
				throw new ErrorResponse("Calculated base quantity must be > 0", 400);
			}

			let productTypeLabel = "STANDARD";
			if (product.trackBatches) productTypeLabel = "BATCHED";
			if (product.trackSerials) productTypeLabel = "SERIALIZED";

			// 2.c) Determine cost & perform stock deductions depending on product mode
			let costPerBaseUnit = 0;
			let lineCostTotal = 0;
			let unitPrice = line.unitPrice;
			let discount = line.discountAmount || 0;
			let taxRateOverride =
				typeof line.taxRate === "number" ? line.taxRate : null;

			if (product.trackBatches) {
				// ---------------- BATCHED PRODUCT ----------------
				if (!batchId) {
					throw new ErrorResponse(
						"batchId is required for batched product",
						400
					);
				}

				const batch = await BatchModel.findOne({
					_id: batchId,
					productId: product._id,
					organizationId,
					isActive: true,
				}); // Removed .session(session)

				if (!batch) {
					throw new ErrorResponse("Batch not found or inactive", 404);
				}

				if (batch.currentQuantity < quantityBase) {
					throw new ErrorResponse("Insufficient batch stock", 400);
				}

				costPerBaseUnit = Number(batch.batchCostPrice || 0);
				lineCostTotal = costPerBaseUnit * quantityBase;

				if (typeof unitPrice !== "number") {
					const unitSale = (batch.unitSales || []).find(
						(us) => String(us.unitId) === String(saleUnitId)
					);
					if (unitSale) unitPrice = Number(unitSale.price || 0);
					else unitPrice = Number(batch.batchSellingPrice || 0);
				}

				// Deduct from batch
				batch.currentQuantity = Number(batch.currentQuantity) - quantityBase;
				if (batch.currentQuantity <= 0) {
					batch.currentQuantity = 0;
					batch.isActive = false;
				}
				await batch.save(); // Removed { session }
			} else if (product.trackSerials) {
				// ---------------- SERIALIZED PRODUCT ----------------
				if (!serialIds || !Array.isArray(serialIds) || serialIds.length === 0) {
					throw new ErrorResponse(
						"serialIds are required for serialized product",
						400
					);
				}

				if (serialIds.length !== quantity) {
					throw new ErrorResponse(
						"Quantity must match number of selected serials",
						400
					);
				}

				const serialDocs = await SerialModel.find({
					_id: { $in: serialIds },
					productId: product._id,
					organizationId,
					status: "AVAILABLE",
				}); // Removed .session(session)

				if (serialDocs.length !== serialIds.length) {
					throw new ErrorResponse(
						"Some serials are not available or do not belong to this product",
						400
					);
				}

				const totalSerialCost = serialDocs.reduce(
					(sum, s) => sum + Number(s.costPrice || 0),
					0
				);
				lineCostTotal = totalSerialCost;
				costPerBaseUnit = totalSerialCost / serialDocs.length || 0;

				if (typeof unitPrice !== "number") {
					const avgSerialPrice =
						serialDocs.reduce((sum, s) => sum + Number(s.sellPrice || 0), 0) /
							serialDocs.length || 0;
					unitPrice = Number(
						product.sellPrice != null && product.sellPrice > 0
							? product.sellPrice
							: avgSerialPrice
					);
				}

				// Mark serials as SOLD
				await SerialModel.updateMany(
					{ _id: { $in: serialIds } },
					{ $set: { status: "SOLD", updatedBy: userId } }
				); // Removed { session }
			} else if (product.trackInventory) {
				// ---------------- STANDARD INVENTORY PRODUCT ----------------
				const stdInv = await StandardInventoryProductModel.findOne({
					productId: product._id,
					organizationId,
				}); // Removed .session(session)

				if (!stdInv) {
					throw new ErrorResponse(
						"Standard inventory record not found for product",
						404
					);
				}

				if (stdInv.currentQuantity < quantityBase) {
					throw new ErrorResponse("Insufficient stock", 400);
				}

				costPerBaseUnit = Number(stdInv.costPrice || 0);
				lineCostTotal = costPerBaseUnit * quantityBase;

				if (typeof unitPrice !== "number") {
					const saleUnit = await MeasuringUnit.findById(saleUnitId); // Removed .session(session)
					if (!saleUnit) {
						throw new ErrorResponse(
							"Invalid sale unit for standard product",
							400
						);
					}
					const basePrice = Number(product.sellPrice || 0);
					unitPrice = basePrice * Number(saleUnit.multiplierToBase || 1);
				}

				// Deduct stock
				stdInv.currentQuantity = Number(stdInv.currentQuantity) - quantityBase;
				if (stdInv.currentQuantity < 0) stdInv.currentQuantity = 0;
				await stdInv.save(); // Removed { session }
			} else {
				// ---------------- NON-INVENTORY / SERVICE ----------------
				costPerBaseUnit = 0;
				lineCostTotal = 0;

				if (typeof unitPrice !== "number") {
					unitPrice = Number(product.sellPrice || 0);
				}
			}

			// 2.d) Compute pricing & tax for line
			const grossAmount = quantity * unitPrice;
			const netAmount = grossAmount - discount;

			const taxRate =
				typeof taxRateOverride === "number"
					? taxRateOverride
					: typeof product.taxRate === "number"
					? product.taxRate
					: 0;

			const taxAmount = (netAmount * taxRate) / 100;
			const lineTotal = netAmount + taxAmount;

			const lineProfit = lineTotal - lineCostTotal;

			totalGross += grossAmount;
			totalDiscount += discount;
			totalTax += taxAmount;
			totalAmount += lineTotal;
			totalCost += lineCostTotal;
			totalProfit += lineProfit;

			console.log(
				"✅ Details Passed 3===>",
				totalGross,
				totalDiscount,
				totalTax,
				totalAmount,
				totalCost,
				totalProfit
			);

			// 2.e) Update Product master quantity
			if (
				product.trackInventory ||
				product.trackBatches ||
				product.trackSerials
			) {
				product.totalQuantity =
					Number(product.totalQuantity || 0) - quantityBase;
				if (product.totalQuantity < 0) product.totalQuantity = 0;
				await product.save(); // Removed { session }
			}

			// 2.f) Create ledger rows
			if (product.trackSerials && serialIds.length > 0) {
				for (const sId of serialIds) {
					// Changed to create(obj) instead of create([arr], {session})
					let createdOne = await InventoryLedgerModel.create({
						organizationId,
						productId: product._id,
						serialId: sId,
						quantityChange: -1,
						transactionType: "SALE",
						unitCost: costPerBaseUnit,
						unitPrice,
						unitTaxRate: taxRate,
						productType: productTypeLabel,
						referenceId: invoiceNumber,
						performedBy: userId,
					});

					console.log("✅ Created Ledger Entries 1 ===>", createdOne);
				}
			} else {
				// Changed to create(obj)
				let createdOne = await InventoryLedgerModel.create({
					organizationId,
					productId: product._id,
					batchId: product.trackBatches ? batchId : undefined,
					quantityChange: -quantityBase,
					transactionType: "SALE",
					unitCost: costPerBaseUnit,
					unitPrice,
					unitTaxRate: taxRate,
					productType: productTypeLabel,
					referenceId: invoiceNumber,
					performedBy: userId,
				});
				console.log("✅ Created Ledger Entries 2 ===>", createdOne);
			}

			// 2.g) Prepare sales line snapshot
			salesLines.push({
				productId: product._id,
				productName: product.name,
				productType: productTypeLabel,
				productCode: product.code,
				sku: product.sku,
				baseUnitId,
				saleUnitId,
				quantity,
				quantityBase,
				batchId: product.trackBatches ? batchId : undefined,
				serialIds: product.trackSerials ? serialIds : [],
				unitPrice,
				grossAmount,
				discountAmount: discount,
				netAmount,
				taxRate,
				taxAmount,
				lineTotal,
				costPerBaseUnit,
				lineCostTotal,
				lineProfit,
			});
		}

		const saleDoc = await SalesInvoiceModel.create({
			organizationId,
			invoiceNumber,
			invoiceDate: now,
			customerId,
			customerName,
			customerCode,
			notes,
			payment: {
				mode,
				paidAmount,
				transactionId,
			},
			lines: salesLines,
			totalGross,
			totalDiscount,
			totalTax,
			totalAmount,
			totalCost,
			totalProfit,
			createdBy: userId,
		});

		// here we need to send all the details by populating the organization and customerId
		const populatedSaleDoc = await SalesInvoiceModel.findById(saleDoc._id)
			.populate(
				"customerId",
				"name phoneNo email address city state postalCode"
			)
			.populate(
				"organizationId",
				"legalName registrationNumber email phone address city state postalCode"
			)
			.lean();

		console.log("✅ Created Sales Doc ==>", populatedSaleDoc);

		res.status(201).json({
			success: true,
			data: populatedSaleDoc,
		});

		console.log("✅ Created Sales Doc ==>", populatedSaleDoc);
	} catch (err) {
		console.error("Error in createSale:", err);
		return next(
			err instanceof ErrorResponse
				? err
				: new ErrorResponse(err.message || "Failed to create sale", 500)
		);
	}
});  now what we need to do is we need to think for selling the stocks like selecting the product and then we need to add the selling Unit if there are multiple sales units received for the product then we need to show user the units the user selected to sell in that and accordingly we need to show updates in ui if user select the unit to sell other then base unit then we need to manage it acoordingly that selected unit will be displayed to user and also in quantity of cart we need to mention that 1 qty * the sale unit multiplier i hope you understand the concern or concept like if i have 10 kg of 2 bags saved as 20,000 gram in the DB and user saved to sell in the different units like 1 kg 1gm 5kg then showing user the sales units and user select the unit will auto trigger the next flow like qunatitiy management will be updateed to that unit like if i have selected the 5kg bag then looking for its multiplier i can only add 4 quantities 5 * 4 = 20kg or 20000 gram this conversion also need to be shown to the useer and also we need to mention this into the Confirm Payment modal the actual units and then we need to update in the PDF generated also and the rest actual data will be handled by backend correctly @Cart.tsx @Toolbar.tsx @posSalesStore.ts i hope you get it correctly  -->
