import { afterEach, describe, it, expect, vi } from "vitest";
import {
  previewCustomerMaster,
  applyCustomerMaster,
  type CustomerMasterPreview,
  type CustomerMasterResolution,
} from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("Customer Master reviewed request binding", () => {
  it("sends the same reviewed choices and exact workbook with preview and confirmation", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "local-test-token" });
    const resolutions: CustomerMasterResolution[] = [
      {
        customerId: "507f1f77bcf86cd799439011",
        field: "customerName",
        choice: "excel",
        expectedCurrent: "Reviewed ARS name",
      },
    ];
    const data = {
      workbookSha256: "sha",
      planFingerprint: "approved-plan",
      resolutions,
    } as CustomerMasterPreview;
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const file = new File(["actual workbook bytes"], "working.xlsx");
    const preview = await previewCustomerMaster(file, resolutions);
    await applyCustomerMaster(file, preview);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [, request] of fetcher.mock.calls as any) {
      const form = request.body as FormData;
      expect(JSON.parse(String(form.get("resolutions")))).toEqual(resolutions);
      expect(await (form.get("file") as File).text()).toBe(
        "actual workbook bytes",
      );
    }
    const form = (fetcher.mock.calls[1] as any)[1].body as FormData;
    expect(form.get("planFingerprint")).toBe("approved-plan");
    expect(form.get("confirm")).toBe("APPROVE AND APPLY");
  });
});
