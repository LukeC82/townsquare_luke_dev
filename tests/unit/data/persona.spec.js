const personas = require("../../../src/persona.json");
const roles = require("../../../src/roles.json");

describe("persona.json integrity", () => {
  // Build a flat set of all reminder strings across all roles
  const allReminders = new Set();
  for (const role of roles) {
    if (Array.isArray(role.reminders)) {
      for (const r of role.reminders) allReminders.add(r);
    }
    if (Array.isArray(role.remindersGlobal)) {
      for (const r of role.remindersGlobal) allReminders.add(r);
    }
  }

  test("every persona reminder exists in roles.json (reminders or remindersGlobal)", () => {
    const missing = personas
      .map((p) => p.reminder)
      .filter((r) => !allReminders.has(r));

    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[persona.json] The following reminders are not found in any role in roles.json:\n" +
          missing.map((r) => `  - "${r}"`).join("\n") +
          "\nUpdate persona.json or roles.json to keep them in sync."
      );
    }

    expect(missing).toEqual([]);
  });
});
