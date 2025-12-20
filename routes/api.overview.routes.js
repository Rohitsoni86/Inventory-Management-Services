const express = require("express");
const {
	getDashboardCardsData,
	getDashboardChartData,
	getTopCategories,
	getFinancialOverview,
	getTopSellingProducts,
	getRecentSales,
	getStockAlerts,
	getCustomerSummary,
	getPaymentModeSummary,
} = require("../controllers/overviewController");
const dashboardOverViewRouter = express.Router();
const {
	verifyOrganizationJWT,
	verifyAdminJWT,
} = require("../middlewares/verifyJWT");

dashboardOverViewRouter.use(verifyAdminJWT);

dashboardOverViewRouter.route("/cards").get(getDashboardCardsData);

dashboardOverViewRouter.route("/chart").get(getDashboardChartData);

dashboardOverViewRouter.route("/top-categories").get(getTopCategories);

dashboardOverViewRouter.route("/financial-overview").get(getFinancialOverview);

dashboardOverViewRouter.route("/top-products").get(getTopSellingProducts);

dashboardOverViewRouter.route("/recent-sales").get(getRecentSales);

dashboardOverViewRouter.route("/stock-alerts").get(getStockAlerts);

dashboardOverViewRouter.route("/customer-summary").get(getCustomerSummary);

dashboardOverViewRouter.route("/payment-modes").get(getPaymentModeSummary);

module.exports = dashboardOverViewRouter;
