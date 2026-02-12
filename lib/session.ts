import { randomBytes } from "node:crypto";

/**
 * Generates a secure random session token
 * @returns A base64url-encoded random token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Calculates the expiration date for a session
 * @param days Number of days until expiration (default: 7)
 * @returns Date object representing the expiration time
 */
export function getSessionExpirationDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
