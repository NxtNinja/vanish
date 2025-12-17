import { treaty } from "@elysiajs/eden";
import type { app } from "../app/api/[[...slugs]]/route";

// .api to enter /api prefix
export const client = treaty<app>(
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).api;
