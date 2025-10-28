/* eslint-disable import/no-unused-modules */
import { describe, it, expect } from "bun:test";
import { availableAuthProviders } from "../../../src/data";

describe("auth", () => {
  it("includes none", () => {
    expect(availableAuthProviders).toContain("none");
  });
});
