import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("320px layouts, RTL, keyboard submission, and browser accessibility", async ({
  page,
}) => {
  const requests: string[] = [];
  let saved: Record<string, unknown> | null = null;
  await page.route("**/fixture/**", async (route) => {
    const request = route.request();
    requests.push(request.url());
    if (request.url().endsWith("/member"))
      return route.fulfill({
        json: {
          member: {
            _id: "member",
            contactId: "contact",
            loginEmail: "buyer@example.com",
            contact: { firstName: "Trade", lastName: "Buyer" },
          },
        },
      });
    if (request.method() === "POST") {
      saved = request.postDataJSON();
      return route.fulfill({ json: { _id: "saved", status: "pending" } });
    }
    return route.fulfill({ json: { items: [] } });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error(message.text());
  });
  page.on("requestfailed", (request) => {
    console.error(request.url(), request.failure()?.errorText);
  });
  await page.goto("/?mode=edit");
  await expect(
    page.getByRole("heading", { name: "Wholesale Partner Application" }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  for (const rtl of [false, true]) {
    await page.goto(`/?mode=edit&rtl=${rtl}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/wholesale-form-${rtl ? "rtl" : "ltr"}-320.png`,
      fullPage: true,
    });
  }
  await page.goto("/?mode=live&rtl=true");
  const submit = page.getByRole("button", { name: "Submit Application" });
  await expect(submit).toBeEnabled();
  await page.getByLabel("Business Name").fill("Trade Supply");
  await page.getByLabel("Phone Number *").fill("12345678");
  await page
    .getByLabel("Additional Information")
    .fill("We order supplies each month.");
  await page.addScriptTag({
    content: await readFile(
      new URL(import.meta.resolve("axe-core/axe.min.js")),
      "utf8",
    ),
  });
  const violations = await page.evaluate(
    async () =>
      (
        await (
          window as unknown as {
            axe: {
              run: (
                target: Document,
              ) => Promise<{ violations: { id: string }[] }>;
            };
          }
        ).axe.run(document)
      ).violations,
  );
  expect(violations.map((value) => value.id)).toEqual([]);
  await page.getByLabel("Phone Number *").focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement?.getAttribute("type")),
  ).toBe("checkbox");
  await page.keyboard.press("Space");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "Application Submitted Successfully!",
  );
  expect(saved).toMatchObject({
    memberId: "member",
    contactId: "contact",
    email: "buyer@example.com",
    status: "pending",
    businessName: "Trade Supply",
    interestedProducts: "Hardware & Tools",
  });
  expect(errors).toEqual([]);
});
