import { test, expect } from '@playwright/test';

test.describe('MagicSmoke Interactive Engineering Workspace E2E', () => {
  test('exercises two-panel layout, realistic hardware schematic, wire selection, deletion, wiring gesture, and 3D simulation', async ({ page }) => {
    page.on('console', (msg) => console.log('[BROWSER]', msg.text()));

    // 1. Clear localStorage and load pristine default state
    console.log('[E2E] Step 1: Navigating to /');
    await page.goto('/');
    console.log('[E2E] Step 1b: Clearing localStorage');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 2. Verify Primary Two-Panel Layout (Code Editor left, Circuit Canvas right)
    console.log('[E2E] Step 2: Verifying two-panel layout');
    await expect(page.getByText('MAGICSMOKE', { exact: true })).toBeVisible();
    await expect(page.locator('text=sketch.ino')).toBeVisible();
    await expect(page.locator('text=Pin-to-Pin Circuit Schematic')).toBeVisible();

    // Verify initial wire count is 15
    const wireCount = page.locator('[data-testid="wire-count"]');
    await expect(wireCount).toHaveText('15');

    // 3. Verify Realistic Schematic Symbols are rendered
    console.log('[E2E] Step 3: Verifying realistic schematic symbols');
    await expect(page.locator('text=ESP-WROOM-32')).toBeVisible();
    await expect(page.locator('text=TB6612FNG').first()).toBeVisible();
    await expect(page.locator('text=7.4V').first()).toBeVisible();

    // Capture screenshot of the upgraded, realistic two-panel schematic
    console.log('[E2E] Step 3b: Capturing screenshot');
    await page.screenshot({ path: 'test/magicsmoke_default_twopanel.png', fullPage: true });

    // 4. Test Wire Selection & Wire Deletion via Toolbar Button
    console.log('[E2E] Step 4: Selecting motor wire');
    const motorWire = page.locator('[data-testid="wire-w_ao1"]');
    await expect(motorWire).toBeVisible();

    const hit = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="wire-w_ao1"]');
      if (!el) return 'NOT_FOUND';
      const rect = el.getBoundingClientRect();
      const elemAtCenter = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        elemAtCenterTag: elemAtCenter?.tagName,
        elemAtCenterTestId: elemAtCenter?.getAttribute('data-testid'),
        elemAtCenterClass: String(elemAtCenter?.className),
      };
    });
    console.log('[E2E] Hit test at center:', JSON.stringify(hit));

    await motorWire.dispatchEvent('click');

    console.log('[E2E] Step 4b: Clicking delete wire button');
    // "Delete Wire" button appears in toolbar
    const deleteBtn = page.locator('[data-testid="delete-wire-btn"]');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    console.log('[E2E] Step 4c: Awaiting wire count 14');
    await expect(wireCount).toHaveText('14');
    console.log('[E2E] Step 4d: Awaiting motorWire not visible');
    await expect(motorWire).not.toBeVisible();

    // 5. Test Interactive Pin-to-Pin Connection Gesture (Re-wiring AO1 to motor_left:M_POS)
    console.log('[E2E] Step 5: Preparing pin locators');
    const tbAo1Pin = page.locator('[data-testid="pin-circle-tb6612_1-AO1"]');
    const motorLeftPosPin = page.locator('[data-testid="pin-circle-motor_left-M_POS"]');

    await expect(tbAo1Pin).toBeVisible();
    await expect(motorLeftPosPin).toBeVisible();

    // Drag from TB6612FNG AO1 to motor_left M_POS
    console.log('[E2E] Step 5b: Hovering source pin and mouse down');
    const pinHit = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pin-circle-tb6612_1-AO1"]');
      if (!el) return 'NOT_FOUND';
      const rect = el.getBoundingClientRect();
      const elem = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        elemTag: elem?.tagName,
        elemTestId: elem?.getAttribute('data-testid'),
      };
    });
    console.log('[E2E] Pin hit test:', JSON.stringify(pinHit));

    await tbAo1Pin.hover();
    await page.mouse.down();
    console.log('[E2E] Step 5c: Hovering target pin');
    await motorLeftPosPin.hover();
    console.log('[E2E] Step 5d: Awaiting diagnostic pill');
    // Verify connection diagnostic pill displays target confirmation
    await expect(page.locator('text=Release to connect to motor_left:M_POS')).toBeVisible({ timeout: 5000 });
    console.log('[E2E] Step 5e: Mouse up');
    await page.mouse.up();

    // Wire count increases back to 15!
    await expect(wireCount).toHaveText('15');

    // 6. Test Cancelling a Connection with Escape
    await tbAo1Pin.hover();
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    // Wire count remains 15 (no stray partial wire created)
    await expect(wireCount).toHaveText('15');

    // 7. Test Keyboard Deletion (Delete / Backspace on selected wire)
    console.log('[E2E] Step 7: Selecting right motor wire for keyboard delete');
    const rightMotorWire = page.locator('[data-testid="wire-w_bo1"]');
    await rightMotorWire.dispatchEvent('click');
    await expect(deleteBtn).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(wireCount).toHaveText('14');

    // Reconnect BO1 to motor_right:M_POS
    console.log('[E2E] Step 7b: Reconnecting right motor wire');
    const tbBo1Pin = page.locator('[data-testid="pin-circle-tb6612_1-BO1"]');
    const motorRightPosPin = page.locator('[data-testid="pin-circle-motor_right-M_POS"]');
    await tbBo1Pin.hover();
    await page.mouse.down();
    await motorRightPosPin.hover();
    await page.mouse.up();
    await expect(wireCount).toHaveText('15');

    // 8. Open 3D Simulation Drawer via persistent right-edge arrow control
    console.log('[E2E] Step 8: Opening 3D simulation drawer');
    const edgeToggle = page.locator('button[title="Open 3D Simulation Viewport"]');
    await expect(edgeToggle).toBeVisible();
    await edgeToggle.click();
    await expect(page.locator('text=3D Robotics Simulation Viewport')).toBeVisible();

    const viewportInfo = await page.evaluate(() => {
      const container = document.querySelector('.cursor-grab');
      const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
      return {
        containerExists: !!container,
        containerW: container?.clientWidth,
        containerH: container?.clientHeight,
        canvasExists: !!canvas,
        canvasW: canvas?.width,
        canvasH: canvas?.height,
        canvasStyleW: canvas?.style.width,
        canvasStyleH: canvas?.style.height,
      };
    });
    console.log('[E2E] Viewport DOM info:', JSON.stringify(viewportInfo));

    // 9. Run Simulation (Compile & Run)
    console.log('[E2E] Step 9: Clicking Compile & Run');
    const compileBtn = page.locator('button:has-text("Compile & Run")');
    await expect(compileBtn).toBeVisible();
    await compileBtn.click();
    await expect(page.locator('text=RUNNING')).toBeVisible();

    // 10. Verify Serial Monitor receives boot and action logs
    console.log('[E2E] Step 10: Verifying serial logs');
    await expect(page.locator('text=[ESP32-Boot] CPU0: Xtensa dual-core @ 240MHz')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Action: Forward')).toBeVisible({ timeout: 5000 });

    // 11. Verify Motor Telemetry HUD displays active RPM
    console.log('[E2E] Step 11: Verifying telemetry HUD');
    await page.waitForTimeout(1000);
    const telemetryText = await page.locator('text=MOTOR TELEMETRY').locator('..').innerText();
    expect(telemetryText).toContain('RPM');
    expect(telemetryText).toContain('FORWARD_CW');

    const runningViewportInfo = await page.evaluate(() => {
      const container = document.querySelector('.cursor-grab');
      const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
      return {
        containerW: container?.clientWidth,
        containerH: container?.clientHeight,
        canvasW: canvas?.width,
        canvasH: canvas?.height,
        canvasStyleW: canvas?.style.width,
        canvasStyleH: canvas?.style.height,
      };
    });
    console.log('[E2E] Running Viewport DOM info:', JSON.stringify(runningViewportInfo));

    // Capture screenshot of running simulation with upgraded 3D robot hardware
    await page.screenshot({ path: 'test/magicsmoke_running_3d_drawer.png', fullPage: true });

    // 12. Test Pause & Resume
    const pauseBtn = page.locator('button:has-text("Pause")');
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();
    await expect(page.locator('text=PAUSED')).toBeVisible();

    const resumeBtn = page.locator('button:has-text("Resume")');
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();
    await expect(page.locator('text=RUNNING')).toBeVisible();

    // 13. Close 3D Drawer using Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('text=sketch.ino')).toBeVisible();
    await expect(page.locator('text=Pin-to-Pin Circuit Schematic')).toBeVisible();

    // 14. Stop and Reset
    const stopBtn = page.locator('button:has-text("Stop")');
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
    await expect(page.getByText('STOPPED', { exact: true })).toBeVisible();

    const resetBtn = page.getByRole('button', { name: 'Reset', exact: true });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  });
});
