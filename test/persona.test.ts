import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  renderTemplate,
  DREAM_SYSTEM_PROMPT,
  DREAM_REFLECT_PROMPT,
  SUMMARIZER_PROMPT,
  AGENT_BIO,
} = await import("../src/persona.js");

describe("renderTemplate", () => {
  it("substitutes single placeholder", () => {
    assert.equal(renderTemplate("Hello {{name}}", { name: "sheep" }), "Hello sheep");
  });

  it("substitutes multiple placeholders", () => {
    const result = renderTemplate("{{a}} and {{b}}", { a: "foo", b: "bar" });
    assert.equal(result, "foo and bar");
  });

  it("replaces all occurrences of the same placeholder", () => {
    const result = renderTemplate("{{x}} then {{x}}", { x: "yes" });
    assert.equal(result, "yes then yes");
  });

  it("leaves unmatched placeholders intact", () => {
    const result = renderTemplate("{{a}} and {{b}}", { a: "foo" });
    assert.equal(result, "foo and {{b}}");
  });
});

describe("Prompt templates", () => {
  it("DREAM_SYSTEM_PROMPT contains memories placeholder", () => {
    assert.ok(DREAM_SYSTEM_PROMPT.includes("{{memories}}"));
  });

  it("DREAM_REFLECT_PROMPT contains recent_context placeholder", () => {
    assert.ok(DREAM_REFLECT_PROMPT.includes("{{recent_context}}"));
  });

  it("DREAM_REFLECT_PROMPT renders with real values", () => {
    const rendered = renderTemplate(DREAM_REFLECT_PROMPT, {
      agent_identity: "Test agent",
      recent_context: "No memories yet.",
      subjects: "1. A theme",
    });
    assert.ok(!rendered.includes("{{recent_context}}"));
    assert.ok(rendered.includes("No memories yet."));
  });

  it("SUMMARIZER_PROMPT contains interaction placeholder", () => {
    assert.ok(SUMMARIZER_PROMPT.includes("{{interaction}}"));
  });

  it("AGENT_BIO is a non-empty string", () => {
    assert.ok(AGENT_BIO.length > 0);
  });
});
