/* eslint-disable import/no-unused-modules */
import { describe, it, expect } from "bun:test";
import { availableFrontends } from "../../../src/data";

describe("frontend: react", () => {
  it("react is available", () => {
    expect(availableFrontends).toContain("react");
  });
});
