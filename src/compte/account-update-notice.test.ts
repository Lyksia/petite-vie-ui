import { describe, expect, it } from "vitest";
import { ACCOUNT_NOTICE_INTERVAL_MS, accountNoticeDue } from "./account-update-notice";

describe("accountNoticeDue", () => {
  it("montre le rappel s'il n'a jamais été repoussé", () => {
    expect(accountNoticeDue(null, 1_000)).toBe(true);
    expect(accountNoticeDue(undefined, 1_000)).toBe(true);
  });

  it("le cache 3 jours après « Plus tard », puis le remontre", () => {
    const later = 1_000_000;
    expect(accountNoticeDue(later, later + ACCOUNT_NOTICE_INTERVAL_MS - 1)).toBe(false);
    expect(accountNoticeDue(later, later + ACCOUNT_NOTICE_INTERVAL_MS)).toBe(true);
  });
});
