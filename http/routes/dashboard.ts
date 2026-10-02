import { Hono } from "hono";

import {
  getDashboardImportantTickets,
  getDashboardInvoiceEstimate,
  getDashboardNewTickets,
  getDashboardStatistics,
} from "../controllers/dashboard-controllers";

export const dashboardRoutes = new Hono()
  .get("/", ...getDashboardStatistics)
  .get("/new-tickets", ...getDashboardNewTickets)
  .get("/invoice-estimate", ...getDashboardInvoiceEstimate)
  .get("/important-tickets", ...getDashboardImportantTickets);
