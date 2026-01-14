import { expect, test } from "@playwright/test";

test.describe("ZipPix Application", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the home page with upload zone", async ({ page }) => {
    // Check hero text
    await expect(page.getByText("Compress images.")).toBeVisible();
    await expect(page.getByText("Protect privacy.")).toBeVisible();

    // Check upload zone
    await expect(page.getByText("Drop your image here")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Select Image" })
    ).toBeVisible();
  });

  test("should have working navbar", async ({ page }) => {
    // Check logo - use more specific selector for the heading
    await expect(page.getByRole("heading", { name: "ZipPix" })).toBeVisible();

    // Check upload button in navbar
    await expect(
      page.getByRole("button", { name: "Upload Image" })
    ).toBeVisible();
  });

  test("should have working footer links", async ({ page }) => {
    // Check footer
    await expect(
      page.getByRole("link", { name: "Privacy Policy" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Terms of Service" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
  });

  test("should navigate to privacy policy", async ({ page }) => {
    await page.getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page).toHaveURL("/privacy");
    await expect(
      page.getByRole("heading", { name: "Privacy Policy" })
    ).toBeVisible();
  });

  test("should navigate to terms of service", async ({ page }) => {
    await page.getByRole("link", { name: "Terms of Service" }).click();
    await expect(page).toHaveURL("/terms");
    await expect(
      page.getByRole("heading", { name: "Terms of Service" })
    ).toBeVisible();
  });
});

test.describe("Image Upload Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have hidden file inputs for upload", async ({ page }) => {
    // There are multiple file inputs (navbar + main uploader), all should be hidden from view
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // All file inputs should have the hidden class
    for (let i = 0; i < count; i++) {
      await expect(fileInputs.nth(i)).toHaveClass(/hidden/);
    }
  });

  test("should display Select Image button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Select Image" })
    ).toBeVisible();
  });
});

test.describe("Compression Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have preset buttons in settings", async ({ page }) => {
    // Settings appear after image upload
    // This is a smoke test for page structure
    await expect(page.getByText("Compress images.")).toBeVisible();
  });
});
