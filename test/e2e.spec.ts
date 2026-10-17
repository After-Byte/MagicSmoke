import { test, expect } from '@playwright/test';

test.describe('MagicSmoke Tinkercad-Inspired Dashboard & Circuits Workspace E2E', () => {
  test('exercises dashboard project management, component library, wire lifecycle, persistence, and simulation', async ({ page }) => {
    page.on('console', (msg) => console.log('[BROWSER]', msg.text()));

    // 1. Clear localStorage and load pristine default state
    console.log('[E2E] Step 1: Navigating to / and clearing storage');
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 2. Verify Tinkercad-Inspired Dashboard
    console.log('[E2E] Step 2: Verifying Dashboard view');
    await expect(page.getByText('MAGICSMOKE', { exact: true })).toBeVisible();
    await expect(page.locator('text=Circuit Projects')).toBeVisible();
    await expect(page.locator('[data-testid="new-circuit-btn"]')).toBeVisible();

    // Verify starter projects are visible
    const starterCard = page.locator('[data-testid="project-card-starter_2wd_robot"]');
    await expect(starterCard).toBeVisible();
    await expect(page.locator('text=Dual Motor Driver Test Bench')).toBeVisible();
    await expect(page.locator('text=Minimal ESP32 DevKit V1')).toBeVisible();

    // Test Search filtering on dashboard
    console.log('[E2E] Step 2b: Testing Dashboard Search');
    const searchInput = page.locator('[data-testid="dashboard-search-input"]');
    await searchInput.fill('Dual');
    await expect(page.locator('text=Dual Motor Driver Test Bench')).toBeVisible();
    await expect(page.locator('text=Minimal ESP32 DevKit V1')).not.toBeVisible();
    await searchInput.fill(''); // Clear search
    await expect(page.locator('text=Minimal ESP32 DevKit V1')).toBeVisible();

    // Capture screenshot of the Dashboard
    console.log('[E2E] Step 2c: Capturing Dashboard screenshot');
    await page.screenshot({ path: 'test/magicsmoke_dashboard.png', fullPage: true });

    // 3. Open the canonical 2WD Robot circuit project
    console.log('[E2E] Step 3: Opening canonical 2WD Robot circuit');
    const openBtn = page.locator('[data-testid="open-project-btn-starter_2wd_robot"]');
    await openBtn.click();

    // 4. Verify Editor Two-Panel Layout
    console.log('[E2E] Step 4: Verifying Editor workspace');
    await expect(page.locator('[data-testid="back-to-dashboard-btn"]')).toBeVisible();
    await expect(page.locator('text=sketch.ino')).toBeVisible();
    await expect(page.locator('text=Pin-to-Pin Circuit Schematic')).toBeVisible();

    // Verify initial wire count is 15 and component count is 5
    const wireCount = page.locator('[data-testid="wire-count"]');
    await expect(wireCount).toHaveText('15');
    const compCount = page.locator('[data-testid="component-count"]');
    await expect(compCount).toHaveText('5');

    // Verify realistic hardware symbols
    await expect(page.locator('text=ESP-WROOM-32')).toBeVisible();
    await expect(page.locator('text=TB6612FNG').first()).toBeVisible();
    await expect(page.locator('text=7.4V').first()).toBeVisible();

    // Capture screenshot of Circuit Workspace
    console.log('[E2E] Step 4b: Capturing Circuit Workspace screenshot');
    await page.screenshot({ path: 'test/magicsmoke_default_twopanel.png', fullPage: true });

    // 5. Test Component Library Discovery & Placement
    console.log('[E2E] Step 5: Testing Component Library palette');
    const togglePaletteBtn = page.locator('[data-testid="toggle-component-palette"]');
    await expect(togglePaletteBtn).toBeVisible();
    await togglePaletteBtn.click();

    // Drawer opens
    const paletteDrawer = page.locator('[data-testid="component-palette-drawer"]');
    await expect(paletteDrawer).toBeVisible();
    await expect(page.locator('text=COMPONENTS')).toBeVisible();

    // Add Common Ground Bus to circuit
    console.log('[E2E] Step 5b: Adding Common Ground Bus from library');
    const addGndBusBtn = page.locator('[data-testid="add-component-btn-catalog_ground_bus"]');
    await expect(addGndBusBtn).toBeVisible();
    await addGndBusBtn.click();

    // Verify component count increments from 5 to 6
    await expect(compCount).toHaveText('6');
    await expect(page.locator('text=COMMON GND BUS')).toBeVisible();

    // Close palette
    await togglePaletteBtn.click();

    // 6. Test Wire Selection, Color Picker, and Deletion
    console.log('[E2E] Step 6: Testing wire selection, color picker, and deletion');
    const motorWire = page.locator('[data-testid="wire-w_ao1"]');
    await expect(motorWire).toBeVisible();
    await motorWire.dispatchEvent('click');

    // Wire color picker appears
    const colorPicker = page.locator('[data-testid="wire-color-picker"]');
    await expect(colorPicker).toBeVisible();
    console.log('[E2E] Step 6a: Color picker visible');

    // Click purple color button
    console.log('[E2E] Step 6b: Clicking purple color button');
    await page.locator('[data-testid="wire-color-a855f7"]').click();
    console.log('[E2E] Step 6c: Purple color clicked');

    // Delete wire
    const deleteBtn = page.locator('[data-testid="delete-wire-btn"]');
    await expect(deleteBtn).toBeVisible();
    console.log('[E2E] Step 6d: Clicking delete wire button');
    await deleteBtn.click();
    console.log('[E2E] Step 6e: Delete wire clicked');

    // Wire count decreases from 15 to 14
    await expect(wireCount).toHaveText('14');
    await expect(motorWire).not.toBeVisible();
    console.log('[E2E] Step 6f: Wire count verified as 14');

    // 7. Test Interactive Pin-to-Pin Re-wiring (TB6612 AO1 -> motor_left M_POS)
    console.log('[E2E] Step 7: Performing pin-to-pin wiring gesture');
    const tbAo1Pin = page.locator('[data-testid="pin-circle-tb6612_1-AO1"]');
    const motorLeftPosPin = page.locator('[data-testid="pin-circle-motor_left-M_POS"]');

    await expect(tbAo1Pin).toBeVisible();
    await expect(motorLeftPosPin).toBeVisible();

    await tbAo1Pin.hover();
    await page.mouse.down();
    await motorLeftPosPin.hover();
    await expect(page.locator('text=Release to connect to motor_left:M_POS')).toBeVisible({ timeout: 5000 });
    await page.mouse.up();

    // Wire count increments back to 15!
    await expect(wireCount).toHaveText('15');

    // 8. Test Project Persistence (Saving Changes)
    console.log('[E2E] Step 8: Saving project changes');
    const saveBtn = page.locator('[data-testid="save-project-btn"]');
    await saveBtn.click();
    await expect(page.locator('text=Saved!')).toBeVisible();

    // 9. Navigate back to Dashboard and verify persistence
    console.log('[E2E] Step 9: Navigating back to Dashboard');
    const backBtn = page.locator('[data-testid="back-to-dashboard-btn"]');
    await backBtn.click();
    await expect(page.locator('text=Circuit Projects')).toBeVisible();

    // 10. Test "+ New Circuit" creation
    console.log('[E2E] Step 10: Creating New Circuit');
    const newCircuitBtn = page.locator('[data-testid="new-circuit-btn"]');
    await newCircuitBtn.click();

    // Workspace opens with New Circuit
    await expect(page.locator('text=New Circuit')).toBeVisible();
    await expect(wireCount).toHaveText('0');
    await expect(compCount).toHaveText('1');

    // Return to dashboard
    await page.locator('[data-testid="back-to-dashboard-btn"]').click();
    await expect(page.locator('text=Circuit Projects')).toBeVisible();

    // 11. Reopen the saved project and execute simulation
    console.log('[E2E] Step 11: Reopening saved project and running simulation');
    await page.locator('[data-testid="open-project-btn-starter_2wd_robot"]').click();
    await expect(wireCount).toHaveText('15');
    await expect(compCount).toHaveText('6'); // 5 initial + 1 Ground Bus added earlier

    // Click Compile & Run
    const runBtn = page.getByRole('button', { name: /Compile & Run/i });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify simulation is running
    await expect(page.locator('text=RUNNING')).toBeVisible({ timeout: 8000 });

    // Open 3D View drawer
    const drawerBtn = page.getByRole('button', { name: '3D View', exact: true });
    await drawerBtn.click();
    await expect(page.locator('text=3D Robotics Simulation Viewport')).toBeVisible();

    // Capture running simulation screenshot
    console.log('[E2E] Step 11b: Capturing Running 3D simulation screenshot');
    await page.screenshot({ path: 'test/magicsmoke_running_3d_drawer.png', fullPage: true });

    // Stop simulation
    const stopBtn = page.getByRole('button', { name: /Stop/i });
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
    await expect(page.getByText('STOPPED', { exact: true })).toBeVisible();

    console.log('[E2E] All end-to-end verifications passed successfully!');
  });
});
