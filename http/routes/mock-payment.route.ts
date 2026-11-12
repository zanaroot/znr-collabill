import { Hono } from "hono";
import {
  getMockCheckoutPage,
  postMockCheckoutComplete,
  postMockCheckoutFail,
  postMockCheckoutRefund,
} from "@/http/controllers/mock-payment.controller";

export const mockCheckoutRoutes = new Hono()
  .get("/checkout/:checkoutId", getMockCheckoutPage)
  .post("/checkout/:checkoutId/complete", postMockCheckoutComplete)
  .post("/checkout/:checkoutId/fail", postMockCheckoutFail)
  .post("/checkout/:checkoutId/refund", postMockCheckoutRefund);
