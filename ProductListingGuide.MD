# Product Listing and Inventory Handling Guide

This guide explains how to structure your products, handle unit conversions, and manage inventory for different product types (Standard, Batched, and Serialized).

## 1. The Golden Rule: Base Units

To maintain accurate inventory, **always store quantity in the Base Unit**.

- **Base Unit**: The smallest unit you track (e.g., Gram, Milliliter, Piece).
- **Purchase Unit**: How you buy it (e.g., Kg, Box, Crate).
- **Sale Unit**: How you sell it (e.g., 500g Pack, Single Bottle).

**The System Logic:**

1.  **Input**: User enters quantity in Purchase/Sale Unit.
2.  **Process**: System (Frontend or Backend Helper) converts this to Base Unit using the `multiplier`.
3.  **Storage**: Database saves the Base Unit quantity.

---

## 2. Handling Standard Products

**Best for:** Goods without expiry or unique IDs (e.g., Rice, Sugar, Oil, Nails).

### Scenario: Selling Basmati Rice

- **Base Unit**: Gram (g)
- **Purchase Unit**: 25kg Bag (Multiplier: 25,000)
- **Sale Unit**: 1kg Pack (Multiplier: 1,000)

### Step 1: Create Product

```json
{
	"name": "Royal Basmati Rice",
	"type": "STANDARD",
	"baseUnit": "unit_id_for_gram",
	"purchaseUnit": "unit_id_for_25kg_bag",
	"saleUnits": ["unit_id_for_1kg_pack", "unit_id_for_5kg_pack"]
}
```

### Step 2: Adding Stock (Purchase)

You purchase **10 Bags** (25kg each).

1.  **User Input**: Quantity = 10, Unit = 25kg Bag.
2.  **Calculation**: `10 (Qty) * 25,000 (Multiplier) = 250,000 g`.
3.  **API Request**: Send `quantity: 250000` to the `addStock` endpoint.
4.  **Database Update**:
    - `currentQuantity` increases by **250,000**.

### Step 3: Selling Stock

Customer buys **3 Packs** (1kg each).

1.  **User Input**: Quantity = 3, Unit = 1kg Pack.
2.  **Calculation**: `3 (Qty) * 1,000 (Multiplier) = 3,000 g`.
3.  **Database Update**:
    - `currentQuantity` decreases by **3,000**.
    - Remaining Stock: `247,000 g` (which is 9.88 Bags).

---

## 3. Handling Batched Products

**Best for:** Perishable goods (e.g., Milk, Medicine, Cosmetics).

### Scenario: Paracetamol Syrup

- **Base Unit**: Bottle (1 unit)
- **Purchase Unit**: Carton (Contains 50 Bottles)
- **Tracking**: Expiry Date, Batch Number.

### Step 1: Create Product

```json
{
	"name": "Paracetamol Syrup 100ml",
	"type": "BATCHED",
	"trackBatches": true,
	"baseUnit": "unit_id_for_bottle",
	"purchaseUnit": "unit_id_for_carton"
}
```

### Step 2: Adding Stock

You purchase **2 Cartons**.

- Batch A: Expiring Dec 2025.

1.  **Calculation**: `2 (Cartons) * 50 (Multiplier) = 100 Bottles`.
2.  **API Request**: Send `batches` array with `quantity: 100`.
3.  **Database Update**:
    - Creates a **Batch Record**: `{ batchID: "B123", quantity: 100, expiry: "2025-12-31" }`.
    - Updates Product Total: `100`.

### Step 3: Selling Stock

Customer buys **5 Bottles**.

1.  **Logic**: System looks for the batch expiring soonest (FEFO - First Expired First Out).
2.  **Database Update**:
    - Deducts 5 from Batch "B123".
    - Remaining Batch Quantity: 95.

---

## 4. Handling Serialized Products

**Best for:** High-value items with warranties (e.g., Laptops, Phones).

### Scenario: iPhone 15 Pro

- **Base Unit**: Piece
- **Purchase Unit**: Master Box (Contains 10 Pieces) - _Rare, usually tracked per piece immediately._

### Step 1: Create Product

```json
{
	"name": "iPhone 15 Pro",
	"type": "SERIALIZED",
	"trackSerials": true,
	"baseUnit": "unit_id_for_piece"
}
```

### Step 2: Adding Stock

You receive a shipment of **3 Phones**.

1.  **User Input**: You must scan/enter 3 unique Serial Numbers (e.g., SN001, SN002, SN003).
2.  **API Request**: Send `serials` array with 3 objects.
3.  **Database Update**:
    - Creates **3 Serial Records** in `SerialModel`.
    - Status: `AVAILABLE`.
    - Product Total: `3`.

### Step 3: Selling Stock

Customer buys **1 Phone**.

1.  **User Input**: Seller scans `SN002`.
2.  **Database Update**:
    - Finds Serial Record `SN002`.
    - Changes Status to `SOLD`.
    - Product Total: `2`.

---

## 5. Summary of Calculations

| Action                  | Formula                         | Example                    |
| :---------------------- | :------------------------------ | :------------------------- |
| **Convert to Base**     | `Input Qty * Unit Multiplier`   | 5 kg \* 1000 = 5000 g      |
| **Convert for Display** | `Base Qty / Unit Multiplier`    | 5000 g / 1000 = 5 kg       |
| **Stock Value**         | `Base Qty * Cost per Base Unit` | 5000 g \* $0.01/g = $50.00 |

### Common Pitfalls to Avoid

1.  **Mixing Units**: Never add "5 kg" directly to a stock of "5000 grams" without converting. You will end up with 5005 grams instead of 10,000 grams.
2.  **Changing Base Unit**: Once a product has stock, **never** change its Base Unit. It will corrupt all historical data.
3.  **Negative Stock**: Ensure validation prevents selling more than `currentQuantity`.

---

## 6. Handling Prices (Cost & Selling)

Just like quantities, **Prices must be per Base Unit**.

### Scenario: Pricing the N95 Masks

- **Base Unit**: Piece
- **Box Size**: 50 Pieces

| Type              | Your Goal (Box Price)               | Calculation   | System Input (Per Piece) |
| :---------------- | :---------------------------------- | :------------ | :----------------------- |
| **Cost Price**    | You bought Box for **$25.00**       | `$25.00 / 50` | **$0.50**                |
| **Selling Price** | You want to sell Box for **$75.00** | `$75.00 / 50` | **$1.50**                |

**Why?**
When you sell a single mask later, the system needs to know it costs **$1.50**. If a customer buys a full box (50), the system calculates `50 * $1.50 = $75.00` automatically.

### Scenario: Serialized Product (iPhone 15)

**Context:** You buy a Master Carton containing 10 iPhones.

- **Total Cost:** $8,000 ($800/phone).
- **Target Sell Price:** $1,200/phone.

**Handling:**
Since serialized items are tracked individually, you assign the price **per phone**.

1.  **Input**:
    - `costPrice`: **800**
    - `sellPrice`: **1200**
2.  **Payload Structure**:
    Inside the `serials` array, each object gets its own price.

### Scenario: Standard Product (Basmati Rice)

**Context:** You buy a 25kg Bag.

- **Base Unit:** Gram (g).
- **Bag Cost:** $50.00.
- **Bag Sell Price:** $75.00.

**Handling:**
You must convert prices to **per gram**.

1.  **Calculations**:
    - Cost: `$50 / 25,000g` = **0.002**
    - Sell: `$75 / 25,000g` = **0.003**
2.  **Payload Structure**:
    Send `unitCost` (0.002) and `unitPrice` (0.003) at the root of the request, along with `quantity` (25000).
