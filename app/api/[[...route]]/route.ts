import { handle } from "hono/vercel";
import { app } from "@/http/routes";

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
