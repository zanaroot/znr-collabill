import { Hono } from "hono";

import {
  getDashboardNewTickets,
  getDashboardStatistics,
} from "../controllers/dashboard-controllers";

export const dashboardRoutes = new Hono()
  .get("/", ...getDashboardStatistics)
  .get("/new-tickets", ...getDashboardNewTickets);
