# Dashboard Overview Controller Documentation

## Introduction

This document provides a detailed explanation of the `overviewController.js` file. This controller is responsible for handling all API requests related to the dashboard's data visualization, providing a comprehensive overview of sales, products, and inventory metrics.

For a beginner, this file is an excellent resource to learn about creating complex data-driven APIs in a Node.js and Express.js environment, with a focus on powerful data processing using MongoDB's Aggregation Pipeline.

## Core Concepts

Before diving into the specific functions, let's understand some of the core concepts and tools used in this controller.

### Express.js Controllers

In the Model-View-Controller (MVC) architecture, the controller acts as a bridge between the model (our database) and the view (whatever consumes the API, like a frontend application). The `overviewController.js` is responsible for receiving API requests, processing them (often by fetching data from the database), and sending a response back.

### `asyncHandler`

`asyncHandler` is a utility middleware that wraps our asynchronous route handlers. In JavaScript, database operations are asynchronous (they return Promises). If an error occurs in a Promise, it can crash the server if not handled properly. `asyncHandler` catches any errors that occur in our async functions and passes them to our Express error handling middleware, preventing the server from crashing.

### MongoDB Aggregation Pipeline

This is the most powerful concept used in this controller. Think of it as a data processing pipeline for your MongoDB data. You send your data through a series of "stages," where each stage transforms the data in some way. This allows you to perform complex data analysis and transformation directly in the database, which is very efficient.

Here are the stages used in this controller:

-   **`$match`**: Filters documents, similar to a `WHERE` clause in SQL.
-   **`$group`**: Groups documents by a specified key and allows you to perform calculations on the grouped data (e.g., `$sum`, `$avg`).
-   **`$sort`**: Sorts the documents based on a specified field.
-   **`$limit`**: Restricts the number of documents passed to the next stage.
-   **`$unwind`**: Deconstructs an array field from the input documents to output a document for each element.
-   **`$lookup`**: Performs a `LEFT OUTER JOIN` to another collection in the same database to combine documents.
-   **`$project`**: Reshapes documents, allowing you to add new fields, remove existing fields, or rename fields.
-   **`$facet`**: Allows you to process the same input documents through multiple pipelines (facets) within a single stage. This is very useful for getting both paginated data and the total count in one database query.

### `date-fns`

`date-fns` is a modern JavaScript date utility library. It provides a clean and consistent API for parsing, manipulating, and formatting dates. In this controller, it's used to handle date-based filtering, such as getting data for "today," "this month," or parsing dates from a specific format like "DD-MM-YYYY".

---

## Controller Functions

Here's a breakdown of each function in the `overviewController.js`.

### 1. `getDashboardCardsData`

-   **Purpose**: Fetches key performance indicators (KPIs) for the dashboard cards, such as total sales, purchase, profit, tax, total products, and total customers.
-   **Route**: `GET /api/v1/overview/cards`
-   **Access**: Private
-   **Parameters**:
    -   `startDate` (String, Optional, Format: "DD-MM-YYYY"): The start of the date range.
    -   `endDate` (String, Optional, Format: "DD-MM-YYYY"): The end of the date range.
    -   `mode` (String, Optional): Can be `day`, `month`, or `year`. Used if `startDate` and `endDate` are not provided. Defaults to `day`.
-   **Response Structure**:
    ```json
    {
      "success": true,
      "data": {
        "totalSales": 15000,
        "totalPurchase": 10000,
        "netProfit": 5000,
        "totalTax": 1500,
        "totalProducts": 120,
        "totalCustomers": 50
      }
    }
    ```

### 2. `getDashboardChartData`

-   **Purpose**: Provides time-series data for creating charts (e.g., a line chart of sales over time).
-   **Route**: `GET /api/v1/overview/chart`
-   **Access**: Private
-   **Parameters**:
    -   `startDate` (String, Optional, Format: "DD-MM-YYYY"): The start of the date range.
    -   `endDate` (String, Optional, Format: "DD-MM-YYYY"): The end of the date range.
    -   `mode` (String, Optional): Can be `day`, `month`, or `year`. Defaults to `day`.
-   **Response Structure**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "2025-12-18",
          "totalSales": 5000,
          "totalPurchase": 3000,
          "netProfit": 2000,
          "totalTax": 500
        },
        {
          "_id": "2025-12-19",
          "totalSales": 7500,
          "totalPurchase": 4500,
          "netProfit": 3000,
          "totalTax": 750
        }
      ]
    }
    ```

### 3. `getTopCategories`

-   **Purpose**: To identify the top-performing product categories based on sales revenue.
-   **Route**: `GET /api/v1/overview/top-categories`
-   **Access**: Private
-   **Parameters**:
    -   `limit` (Number, Optional): The number of top categories to return. Defaults to 5.
-   **Response Structure**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "65377f5f5e2e7c2a4c3b1e7a",
          "name": "Electronics",
          "totalSales": 1500,
          "percentage": 50
        },
        {
          "_id": "65377f5f5e2e7c2a4c3b1e7b",
          "name": "Books",
          "totalSales": 750,
          "percentage": 25
        }
      ]
    }
    ```

### 4. `getFinancialOverview`

-   **Purpose**: Get Financial Overview for multiple years.
-   **Route**: `GET /api/v1/overview/financial-overview`
-   **Access**: Private
-   **Parameters**:
    -   `years` (String, Required): Comma-separated list of years (e.g., "2023,2024").
-   **Response Structure**:
    ```json
    {
        "success": true,
        "data": [
            {
                "year": 2023,
                "monthlyData": [
                    { "month": 1, "totalIncome": 1000, "totalExpense": 500 },
                    { "month": 2, "totalIncome": 1200, "totalExpense": 600 }
                ]
            }
        ]
    }
    ```

### 5. `getTopSellingProducts`

-   **Purpose**: Get Top N Selling Products, filterable by a date range or mode.
-   **Route**: `GET /api/v1/overview/top-products`
-   **Access**: Private
-   **Parameters**:
    -   `limit` (Number, Optional): Number of products to return. Defaults to 5.
    -   `startDate` (String, Optional, Format: "DD-MM-YYYY"): The start of the date range.
    -   `endDate` (String, Optional, Format: "DD-MM-YYYY"): The end of the date range.
    -   `mode` (String, Optional): Can be `day`, `month`, or `year`.
-   **Response Structure**:
    ```json
    {
        "success": true,
        "data": [
            {
                "productId": "605c724f8d3e6c1a7c8b4567",
                "name": "Product A",
                "sku": "SKU-A",
                "totalQuantitySold": 50,
                "totalSales": 5000
            }
        ]
    }
    ```

### 6. `getRecentSales`

-   **Purpose**: Get a list of the most recent sales invoices.
-   **Route**: `GET /api/v1/overview/recent-sales`
-   **Access**: Private
-   **Parameters**:
    -   `limit` (Number, Optional): Number of recent sales to return. Defaults to 5, max 10.
-   **Response Structure**:
    ```json
    {
        "success": true,
        "data": [
            {
                "_id": "605c724f8d3e6c1a7c8b4567",
                "invoiceNumber": "INV-001",
                "customerName": "Customer A",
                "invoiceDate": "2025-12-18T10:00:00.000Z",
                "totalAmount": 150.75
            }
        ]
    }
    ```

### 7. `getStockAlerts`

-   **Purpose**: Identifies products whose stock levels are at or below their pre-defined reorder point.
-   **Route**: `GET /api/v1/overview/stock-alerts`
-   **Access**: Private
-   **Parameters**:
    -   `page` (Number, Optional): The page number for pagination. Defaults to 1.
    -   `limit` (Number, Optional): The number of items per page. Defaults to 10.
    -   `category` (String, Optional): The ID of a category to filter by.
    -   `brand` (String, Optional): The ID of a brand to filter by.
    -   `productType` (String, Optional): The product type code to filter by.
-   **Response Structure**:
    ```json
    {
        "success": true,
        "total": 20,
        "count": 10,
        "pagination": {
            "next": {
                "page": 2,
                "limit": 10
            }
        },
        "data": [
            {
                "_id": "605c724f8d3e6c1a7c8b4567",
                "name": "Product A",
                "sku": "SKU-A",
                "totalQuantity": 5,
                "reorderPoint": 10,
                "category": "Electronics",
                "brand": "BrandX"
            }
        ]
    }
    ```

### 8. `getYearlySalesAnalysis`

-   **Purpose**: Get Yearly Sales Analysis for multiple years.
-   **Route**: `GET /api/v1/overview/yearly-sales`
-   **Access**: Private
-   **Parameters**:
    -   `years` (String, Required): Comma-separated list of years (e.g., "2023,2024").
-   **Response Structure**:
    ```json
    {
        "success": true,
        "data": [
            {
                "year": 2023,
                "salesData": [
                    { "month": 1, "totalSales": 1000 },
                    { "month": 2, "totalSales": 1200 }
                ]
            }
        ]
    }
    ```

### 9. `getCustomerSummary`

-   **Purpose**: Provides a summary of new vs. returning customers within a specific period.
-   **Route**: `GET /api/v1/overview/customer-summary`
-   **Access**: Private
-   **Parameters**:
    -   `startDate` (String, Optional, Format: "DD-MM-YYYY"): The start of the date range.
    -   `endDate` (String, Optional, Format: "DD-MM-YYYY"): The end of the date range.
    -   `mode` (String, Optional): Can be `day`, `month`, or `year`. Defaults to `year`.
-   **Response Structure**:
    ```json
    {
      "success": true,
      "data": {
        "newCustomers": 10,
        "returningCustomers": 25,
        "totalActiveCustomers": 35
      }
    }
    ```

### 10. `getPaymentModeSummary`

-   **Purpose**: Get a summary of sales grouped by payment mode.
-   **Route**: `GET /api/v1/overview/payment-modes`
-   **Access**: Private
-   **Parameters**:
    -   `startDate` (String, Optional, Format: "DD-MM-YYYY"): The start of the date range.
    -   `endDate` (String, Optional, Format: "DD-MM-YYYY"): The end of the date range.
    -   `mode` (String, Optional): Can be `day`, `month`, or `year`. Defaults to `year`.
-   **Response Structure**:
    ```json
    {
      "success": true,
      "data": [
        {
          "mode": "Cash",
          "totalAmount": 15000
        },
        {
          "mode": "Credit Card",
          "totalAmount": 10000
        }
      ]
    }
    ```

## Conclusion

The `overviewController.js` is a feature-rich and highly educational file. By studying it, a beginner developer can gain practical knowledge of:

-   Building RESTful APIs with Express.js.
-   Handling asynchronous operations gracefully.
-   Performing advanced database queries with MongoDB's Aggregation Pipeline.
-   Implementing complex business logic like data filtering, sorting, pagination, and cross-collection data joining.
-   Using utility libraries like `date-fns` to handle common tasks.

This controller serves as a great example of how to build clean, efficient, and powerful backend services for a modern web application.