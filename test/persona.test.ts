import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { renderTemplate, WAKING_SYSTEM_PROMPT, DREAM_SYSTEM_PROMPT, SUMMARIZER_PROMPT, AGENT_BIO } =
  await import("../src/persona.js");

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
  it("WAKING_SYSTEM_PROMPT contains required placeholders", () => {
    assert.ok(WAKING_SYSTEM_PROMPT.includes("{{working_memory}}"));
    assert.ok(WAKING_SYSTEM_PROMPT.includes("{{deep_memory_stats}}"));
  });

  it("DREAM_SYSTEM_PROMPT contains memories placeholder", () => {
    assert.ok(DREAM_SYSTEM_PROMPT.includes("{{memories}}"));
  });

  it("SUMMARIZER_PROMPT contains interaction placeholder", () => {
    assert.ok(SUMMARIZER_PROMPT.includes("{{interaction}}"));
  });

  it("AGENT_BIO is a non-empty string", () => {
    assert.ok(AGENT_BIO.length > 0);
  });

  it("WAKING_SYSTEM_PROMPT renders with real values", () => {
    const rendered = renderTemplate(WAKING_SYSTEM_PROMPT, {
      working_memory: "No memories yet.",
      deep_memory_stats: '{"total": 0}',
    });
    assert.ok(!rendered.includes("{{working_memory}}"));
    assert.ok(!rendered.includes("{{deep_memory_stats}}"));
    assert.ok(rendered.includes("No memories yet."));
  });
});
