import { test, expect } from '@playwright/test';

test.describe('MagicSmoke Line Follower Lab End-to-End Test Suite', () => {
  test('exercises dashboard launch, 3D simulation viewport, telemetry HUD, PID tuning, circuit schematic, and disclosures', async ({ page }) => {
    // 1. Navigate to Dashboard
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 2. Verify Featured Line Follower Lab Spotlight Banner on Dashboard
    await expect(page.getByText('Autonomous Line Follower Robotics Lab').first()).toBeVisible();
    const launchBtn = page.locator('[data-testid="launch-line-follower-lab-btn"]');
    await expect(launchBtn).toBeVisible();

    // Verify canonical project card on dashboard
    const cardLabBtn = page.locator('[data-testid="launch-lab-card-btn-starter_line_follower_robot"]');
    await expect(cardLabBtn).toBeVisible();

    // 3. Launch Line Follower Lab
    await launchBtn.click();

    // 4. Verify Lab Workspace Header & Badges
    await expect(page.getByText('Line Follower Lab', { exact: true })).toBeVisible();
    await expect(page.getByText('Arduino Uno R3 + 8-CH IR')).toBeVisible();
    await expect(page.getByText('Circuit Verified')).toBeVisible();

    // 5. Verify 3D Arena View & Canvas
    await expect(page.locator('[data-testid="line-follower-3d-canvas"]')).toBeVisible();
    const trackSelect = page.locator('[data-testid="track-type-select"]');
    await expect(trackSelect).toBeVisible();
    await expect(trackSelect).toHaveValue('closed_loop');

    // Test switching track
    await trackSelect.selectOption('straight');
    await expect(trackSelect).toHaveValue('straight');
    await trackSelect.selectOption('closed_loop');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test/screenshot_3d_arena_track.png' });

    // 6. Verify Telemetry HUD
    await expect(page.getByText('8-Channel IR Reflectance Array')).toBeVisible();
    await expect(page.getByText('D1')).toBeVisible();
    await expect(page.getByText('D8')).toBeVisible();
    await expect(page.getByText('TB6612FNG Driver & Motors')).toBeVisible();
    await expect(page.getByText('Left Motor (AO)')).toBeVisible();
    await expect(page.getByText('Right Motor (BO)')).toBeVisible();
    await expect(page.getByText('Physical Odometry & Kinematics')).toBeVisible();

    // 7. Verify Firmware & PID Tab
    const codeTabBtn = page.locator('[data-testid="tab-code-btn"]');
    await codeTabBtn.click();

    await expect(page.getByText('firmware/line_follower_pid.ino')).toBeVisible();
    await expect(page.locator('[data-testid="compile-and-run-btn"]')).toBeVisible();
    await expect(page.getByText('Real-Time PID Gain Sliders')).toBeVisible();
    await expect(page.getByText('Serial Monitor (115200 baud)')).toBeVisible();

    // 8. Verify Circuit Schematic Tab
    const circuitTabBtn = page.locator('[data-testid="tab-circuit-btn"]');
    await circuitTabBtn.click();

    await expect(page.getByText('Hardware Electrical Integrity')).toBeVisible();
    await expect(page.getByText('Common Ground Bus (GND)')).toBeVisible();
    await expect(page.getByText('Independent Motor & Logic Rails')).toBeVisible();
    await expect(page.getByText('Driver Standby (STBY) Pin Active')).toBeVisible();

    // 9. Verify Engineering Disclosures Modal
    const disclosuresBtn = page.locator('[data-testid="lab-disclosures-btn"]');
    await disclosuresBtn.click();

    await expect(page.getByText('Engineering Truth & Simulation Disclosures')).toBeVisible();
    await expect(page.getByText('Firmware Execution Environment:')).toBeVisible();
    await expect(page.getByText('Kinematic & Physical Motor Dynamics:')).toBeVisible();
    await expect(page.getByText('Optical Reflectance Modeling:')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Acknowledge & Close' }).click();
    await expect(page.getByText('Engineering Truth & Simulation Disclosures')).not.toBeVisible();

    // 10. Verify 2D Track Editor Tab
    const trackTabBtn = page.locator('[data-testid="tab-track-btn"]');
    await trackTabBtn.click();

    // Verify 2D Track Editor layout
    await expect(page.locator('[data-testid="track-editor-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="track-preset-select"]')).toBeVisible();

    // Switch presets in 2D Editor
    await page.locator('[data-testid="track-preset-select"]').selectOption('s_curves');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test/screenshot_2d_track_editor.png' });

    // Switch to Arena via "Test in 3D" button
    const runSimBtn = page.locator('[data-testid="test-in-3d-btn"]');
    await runSimBtn.click();
    await expect(page.locator('[data-testid="line-follower-3d-canvas"]')).toBeVisible();

    // 11. Return to Dashboard
    const backBtn = page.locator('[data-testid="lab-back-dashboard-btn"]');
    await backBtn.click();

    await expect(page.getByText('Circuit Projects')).toBeVisible();
    await expect(page.locator('[data-testid="launch-line-follower-lab-btn"]')).toBeVisible();
  });

  test('Problem A verification: robot tracks line with negative feedback steering and active sensor engagement', async ({ page }) => {
    await page.goto('/#lab');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify 3D Arena is visible
    await expect(page.locator('[data-testid="line-follower-3d-canvas"]')).toBeVisible();

    // Let simulation run for 1.2s to track along the line
    await page.waitForTimeout(1200);

    // Verify optical sensors detect the line (nominal tracking)
    await expect(page.getByText('TRACKING NOMINAL')).toBeVisible();
    await expect(page.getByText(/Active: [1-8] \/ 8/)).toBeVisible();

    // Verify motor telemetry is active and forward
    await expect(page.getByText('FORWARD').first()).toBeVisible();
  });

  test('Problem B verification: switching between 2D Track Editor and 3D Arena preserves non-black WebGL viewport', async ({ page }) => {
    await page.goto('/#lab');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 1. Initial 3D Viewport check
    const canvasContainer = page.locator('[data-testid="line-follower-3d-canvas"]');
    await expect(canvasContainer).toBeVisible();
    const canvas = canvasContainer.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify initial WebGL context
    const glActive1 = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="line-follower-3d-canvas"] canvas') as HTMLCanvasElement;
      if (!c) return false;
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return Boolean(gl && !gl.isContextLost());
    });
    expect(glActive1).toBe(true);

    // 2. Switch to 2D Track Editor
    await page.locator('[data-testid="tab-track-btn"]').click();
    await expect(page.locator('[data-testid="track-editor-canvas"]')).toBeVisible();

    // Edit track: select S-Curves preset
    await page.locator('[data-testid="track-preset-select"]').selectOption('s_curves');
    await page.waitForTimeout(200);

    // 3. Switch back to 3D Arena via "Test in 3D" button
    await page.locator('[data-testid="test-in-3d-btn"]').click();

    // 4. Verify 3D viewport canvas is visible, non-zero, and actively rendering
    await expect(canvasContainer).toBeVisible();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(150);
    expect(box!.height).toBeGreaterThan(150);

    // Verify WebGL context is still valid and not lost or blank
    const glActive2 = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="line-follower-3d-canvas"] canvas') as HTMLCanvasElement;
      if (!c) return false;
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return Boolean(gl && !gl.isContextLost() && c.width > 0 && c.height > 0);
    });
    expect(glActive2).toBe(true);

    // Take screenshot to prove viewport is populated with arena floor and track
    await page.waitForTimeout(300);
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(2000);
    await canvas.screenshot({ path: 'test/screenshot_verified_3d_viewport.png' });
  });

  test('Problem C verification: edited tracks persist across browser refresh and survive resets', async ({ page }) => {
    await page.goto('/#lab');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 1. Open 2D Track Editor
    await page.locator('[data-testid="tab-track-btn"]').click();
    await expect(page.locator('[data-testid="track-editor-canvas"]')).toBeVisible();

    // 2. Select Grand Prix Circuit preset first
    await page.locator('[data-testid="track-preset-select"]').selectOption('complex_circuit');
    await page.waitForTimeout(200);

    // 3. Adjust track line width to 36mm
    const widthSlider = page.locator('[data-testid="line-width-slider"]');
    await widthSlider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, '36');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.getByText('36mm')).toBeVisible();

    // 4. Switch to 3D to test
    await page.locator('[data-testid="test-in-3d-btn"]').click();
    await expect(page.locator('[data-testid="line-follower-3d-canvas"]')).toBeVisible();

    // Wait for autosave to flush to localStorage
    await page.waitForTimeout(600);

    // Verify localStorage has cached the track
    const hasCachedTrack = await page.evaluate(() => {
      const cached = localStorage.getItem('magicsmoke_active_lab_track');
      if (!cached) return false;
      const parsed = JSON.parse(cached);
      return parsed.id === 'preset_complex_circuit' && Math.round(parsed.lineWidthMeters * 1000) === 36;
    });
    expect(hasCachedTrack).toBe(true);

    // 5. RELOAD BROWSER (Simulate user refresh)
    await page.reload();

    // 6. Verify the edited track survives browser refresh!
    await expect(page.locator('[data-testid="line-follower-3d-canvas"]')).toBeVisible();

    // Switch to 2D Editor and verify 36mm width is retained
    await page.locator('[data-testid="tab-track-btn"]').click();
    await expect(page.locator('[data-testid="line-width-slider"]')).toHaveValue('36');
    await expect(page.getByText('36mm')).toBeVisible();

    // 7. Test "Reset Default" button
    const resetDefaultBtn = page.locator('[data-testid="reset-default-track-btn"]');
    await expect(resetDefaultBtn).toBeVisible();
    await resetDefaultBtn.click();

    // Verify track is reset to default 24mm oval loop
    await expect(page.locator('[data-testid="line-width-slider"]')).toHaveValue('24');
    await expect(page.getByText('24mm')).toBeVisible();

    // Refresh again to ensure default reset also persists
    await page.waitForTimeout(600);
    await page.reload();
    await page.locator('[data-testid="tab-track-btn"]').click();
    await expect(page.locator('[data-testid="line-width-slider"]')).toHaveValue('24');
  });
});
