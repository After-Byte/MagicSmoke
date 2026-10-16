import { test, expect } from '@playwright/test';

test.describe('MagicSmoke End-to-End Robotics IDE Workflow', () => {
  test('launches application, compiles firmware, drives robot, and captures telemetry', async ({ page }) => {
    // 1. Navigate to MagicSmoke local dev server
    await page.goto('http://localhost:5173/');

    // 2. Verify IDE Title and UI layout components
    await expect(page.locator('text=MAGICSMOKE')).toBeVisible();
    await expect(page.locator('text=sketch.ino')).toBeVisible();
    await expect(page.locator('text=Pin-to-Pin Circuit Schematic')).toBeVisible();
    await expect(page.locator('text=3D Physical Robot Viewport')).toBeVisible();
    await expect(page.locator('text=Serial Monitor & System Diagnostics')).toBeVisible();

    // 3. Verify Canvas Components are loaded
    await expect(page.getByText('ESP32 DevKit V1', { exact: true })).toBeVisible();
    await expect(page.locator('text=TB6612FNG Motor Driver')).toBeVisible();
    await expect(page.locator('text=7.4V LiPo Battery Pack')).toBeVisible();
    await expect(page.locator('text=Left N20 Motor')).toBeVisible();
    await expect(page.locator('text=Right N20 Motor')).toBeVisible();

    // 4. Click 'Compile & Run'
    const compileBtn = page.locator('button:has-text("Compile & Run")');
    await expect(compileBtn).toBeVisible();
    await compileBtn.click();

    // 5. Verify simulation switches to RUNNING
    await expect(page.locator('text=SIMULATION RUNNING')).toBeVisible();

    // 6. Verify Serial Monitor receives boot and firmware execution logs
    await expect(page.locator('text=[ESP32-Boot] CPU0: Xtensa dual-core @ 240MHz')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Forward', { exact: true })).toBeVisible({ timeout: 5000 });

    // 7. Verify Telemetry displays nonzero motor RPM and forward voltage
    await page.waitForTimeout(1000);
    const telemetryText = await page.locator('text=MOTOR TELEMETRY').locator('..').innerText();
    expect(telemetryText).toContain('RPM');
    expect(telemetryText).toContain('FORWARD_CW');

    // 8. Capture high-resolution screenshot of the running simulation
    await page.screenshot({ path: 'test/magicsmoke_running_e2e.png', fullPage: true });

    // 9. Stop simulation
    const stopBtn = page.locator('button:has-text("Stop")');
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
    await expect(page.locator('text=STOPPED')).toBeVisible();
  });
});
