const roles = require("../../../src/roles.json");

describe("remindersPersonaGlobal integrity", () => {
  const rolesWithPersona = roles.filter(
    role =>
      Array.isArray(role.remindersPersonaGlobal) &&
      role.remindersPersonaGlobal.length > 0
  );

  test("remindersPersonaGlobal entries do not overlap with remindersGlobal on the same role", () => {
    const conflicts = [];
    for (const role of rolesWithPersona) {
      const global = new Set(role.remindersGlobal || []);
      for (const r of role.remindersPersonaGlobal) {
        if (global.has(r)) {
          conflicts.push(
            `${role.name}: "${r}" is in both remindersGlobal and remindersPersonaGlobal`
          );
        }
      }
    }
    if (conflicts.length > 0) {
      console.warn(
        "[roles.json] Persona reminder conflicts found:\n" +
          conflicts.map(c => `  - ${c}`).join("\n") +
          "\nMove persona reminders out of remindersGlobal into remindersPersonaGlobal only."
      );
    }
    expect(conflicts).toEqual([]);
  });

  test("remindersPersonaGlobal entries do not overlap with reminders on the same role", () => {
    const conflicts = [];
    for (const role of rolesWithPersona) {
      const perPlayer = new Set(role.reminders || []);
      for (const r of role.remindersPersonaGlobal) {
        if (perPlayer.has(r)) {
          conflicts.push(
            `${role.name}: "${r}" is in both reminders and remindersPersonaGlobal`
          );
        }
      }
    }
    // Apprentice is a known exception: "Is the Apprentice" lives in both reminders
    // (placed per-player by the traveler mechanic) and remindersPersonaGlobal (for victory reveal).
    const knownExceptions = new Set(["Is the Apprentice"]);
    const unexpectedConflicts = conflicts.filter(
      c => !knownExceptions.has(c.split('"')[1])
    );
    if (unexpectedConflicts.length > 0) {
      console.warn(
        "[roles.json] Unexpected persona reminder conflicts with reminders:\n" +
          unexpectedConflicts.map(c => `  - ${c}`).join("\n")
      );
    }
    expect(unexpectedConflicts).toEqual([]);
  });
});

// Alignment derivation used by VictoryModal.trueRoleFor() and VictoryReveal.trueAlignment().
// Rules (in priority order):
//   1. Reminder name starts with "GOOD " → good (overrides team)
//   2. Reminder name starts with "EVIL " → evil (overrides team)
//   3. Role team townsfolk/outsider → good
//   4. Role team minion/demon → evil
describe("persona alignment derivation", () => {
  // Mirror the logic in VictoryModal.trueRoleFor()
  function deriveAlignment(roleTeam, reminderName) {
    let alignment = null;
    if (["townsfolk", "outsider"].includes(roleTeam)) alignment = "good";
    else if (["minion", "demon"].includes(roleTeam)) alignment = "evil";
    if (reminderName.startsWith("GOOD ")) alignment = "good";
    else if (reminderName.startsWith("EVIL ")) alignment = "evil";
    return alignment;
  }

  test("GOOD prefix overrides demon team alignment", () => {
    expect(deriveAlignment("demon", "GOOD Hannibal")).toBe("good");
  });

  test("EVIL prefix keeps evil alignment for demon team", () => {
    expect(deriveAlignment("demon", "EVIL Hannibal")).toBe("evil");
  });

  test("no prefix falls back to team alignment for demon", () => {
    expect(deriveAlignment("demon", "Is the Hannibal")).toBe("evil");
  });

  test("no prefix falls back to team alignment for townsfolk", () => {
    expect(deriveAlignment("townsfolk", "Is the Drunk")).toBe("good");
  });

  test("GOOD prefix overrides minion team alignment", () => {
    expect(deriveAlignment("minion", "GOOD SomeMinion")).toBe("good");
  });

  test("Hannibal role in roles.json has both GOOD and EVIL persona reminders", () => {
    const hannibal = roles.find(r => r.id === "hannibal");
    expect(hannibal).toBeDefined();
    expect(hannibal.remindersPersonaGlobal).toContain("GOOD Hannibal");
    expect(hannibal.remindersPersonaGlobal).toContain("EVIL Hannibal");
  });
});
