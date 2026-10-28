import { describe, expect, it } from "vitest";
import { createCallSchema } from "@/http/models/call.model";

describe("createCallSchema", () => {
  it("accepts a valid payload", () => {
    const result = createCallSchema.safeParse({
      type: "AUDIO",
      calleeId: "3f1a2b3c-4d5e-4f60-8172-839405162738",
    });
    expect(result.success).toBe(true);
  });

  it("accepts VIDEO type", () => {
    const result = createCallSchema.safeParse({
      type: "VIDEO",
      calleeId: "3f1a2b3c-4d5e-4f60-8172-839405162738",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown call types", () => {
    const result = createCallSchema.safeParse({
      type: "SCREEN",
      calleeId: "3f1a2b3c-4d5e-4f60-8172-839405162738",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid callee ids", () => {
    const result = createCallSchema.safeParse({
      type: "AUDIO",
      calleeId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = createCallSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
