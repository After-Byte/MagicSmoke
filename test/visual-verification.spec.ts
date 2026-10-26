import { test, expect } from '@playwright/test';

test.describe('Part 8: Visual Verification of Hardware Components & Previews', () => {
  test('captures Screenshot A (Dashboard), Screenshot B (Line Follower Lab), and Screenshot C (ESP32 Circuit Editor)', async ({ page }) => {
    // 1. Reset storage to clean state so starters migrate and render fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // High definition widescreen viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // ----------------------------------------------------
    // Screenshot A: Circuit Projects Dashboard
    // ----------------------------------------------------
    const circuitProjectsHeading = page.locator('text=Circuit Projects');
    await expect(circuitProjectsHeading).toBeVisible();
    await expect(page.locator('[data-testid="project-card-starter_line_follower_robot"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-starter_2wd_robot"]')).toBeVisible();

    // Scroll down to Circuit Projects section to display the cards and thumbnails
    await circuitProjectsHeading.scrollIntoViewIfNeeded();

    // Wait for SVGs and fonts to settle
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshot_dashboard.png' });
    console.log('[VISUAL] Captured Screenshot A: test/screenshot_dashboard.png');

    // ----------------------------------------------------
    // Screenshot B: Line Follower Lab Schematic
    // ----------------------------------------------------
    // Scroll back up or click launch lab button on card
    const cardLabBtn = page.locator('[data-testid="launch-lab-card-btn-starter_line_follower_robot"]');
    if (await cardLabBtn.isVisible()) {
      await cardLabBtn.click();
    } else {
      const launchLabBtn = page.locator('[data-testid="launch-line-follower-lab-btn"]');
      await launchLabBtn.click();
    }

    // Switch to Circuit Schematic tab in Line Follower Lab
    const circuitTabBtn = page.locator('[data-testid="tab-circuit-btn"]');
    await expect(circuitTabBtn).toBeVisible();
    await circuitTabBtn.click();

    // Verify Arduino board and integrity panel
    await expect(page.locator('.arduino-uno-physical-board')).toBeVisible();
    await expect(page.getByText('Hardware Electrical Integrity')).toBeVisible();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshot_line_follower.png' });
    console.log('[VISUAL] Captured Screenshot B: test/screenshot_line_follower.png');

    // ----------------------------------------------------
    // Screenshot C: ESP32 Circuit Editor
    // ----------------------------------------------------
    // Return to dashboard
    const backBtn = page.locator('[data-testid="back-to-dashboard-btn"]');
    if (await backBtn.isVisible()) {
      await backBtn.click();
    } else {
      const dashBtn = page.locator('button:has-text("Dashboard")');
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
      } else {
        await page.goto('/');
      }
    }

    await expect(page.locator('text=Circuit Projects')).toBeVisible();

    // Open ESP32 2WD Robot circuit project in editor
    const open2wdBtn = page.locator('[data-testid="open-project-btn-starter_2wd_robot"]');
    await expect(open2wdBtn).toBeVisible();
    await open2wdBtn.click();

    // Verify editor view loaded with authentic ESP32 board
    await expect(page.locator('text=sketch.ino')).toBeVisible();
    await expect(page.locator('.esp32-devkit-v1-physical-board')).toBeVisible();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshot_esp32_editor.png' });
    console.log('[VISUAL] Captured Screenshot C: test/screenshot_esp32_editor.png');
  });
});
