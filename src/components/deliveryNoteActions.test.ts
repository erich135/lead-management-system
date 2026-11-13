import { describe, expect, it } from "vitest";
import { deliveryNoteActions } from "./deliveryNoteActions";

describe("delivery note actions", () => {
  it("lets a draft be edited and archived", () => {
    expect(deliveryNoteActions({ workflow: "office", status: "draft" }, "outstanding")).to.deep.equal({
      edit: true, view: false, print: false, archive: true, restore: false,
    });
  });

  it("lets an assigned note be corrected and still archived", () => {
    expect(deliveryNoteActions({ workflow: "office", status: "assigned" }, "outstanding")).to.deep.equal({
      edit: true, view: true, print: false, archive: true, restore: false,
    });
    expect(deliveryNoteActions({ workflow: "office", status: "assigned" }, "archived").edit).to.equal(false);
    expect(deliveryNoteActions({ workflow: "office", status: "assigned" }, "archived").restore).to.equal(true);
  });

  it("prints a completed note and restores an archived one", () => {
    expect(deliveryNoteActions({ workflow: "office", status: "completed" }, "completed").edit).to.equal(false);
    expect(deliveryNoteActions({ workflow: "office", status: "completed" }, "completed").print).to.equal(true);
    expect(deliveryNoteActions({ workflow: "office", status: "completed" }, "archived")).to.deep.equal({
      edit: false, view: false, print: true, archive: false, restore: true,
    });
  });
});
