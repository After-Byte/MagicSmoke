# MagicSmoke Implementation & Issue Tracking

This document tracks the core recommended issues for the MagicSmoke 3D robotics and electronics simulator, their implementation status, and verification evidence.

---

### Issue 1: [RFC] Define MagicSmoke's simulation architecture and MVP
- **Labels:** `architecture` | **Priority:** High
- **Description:** Establish how the code editor, firmware runtime, circuit connectivity, component models, and 3D world communicate.
- **Done when:** An architecture document describes the system boundaries, data flow, first demo, and firmware-runtime options.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - [`docs/architecture/rfc-001-simulation-architecture.md`](./architecture/rfc-001-simulation-architecture.md): Formal RFC defining system boundaries, data flow diagrams, thread/worker architecture, and runtime options.
  - Core implementation coordinator: [`src/simulation/SimulationCoordinator.ts`](../src/simulation/SimulationCoordinator.ts).

---

### Issue 2: Bootstrap the application and local development workflow
- **Labels:** `infrastructure` | **Priority:** High
- **Description:** Establish the frontend, build scripts, test setup, and reproducible installation instructions while preserving the existing branding and MIT license.
- **Done when:** A fresh clone can install dependencies, run locally, build, and execute its initial tests.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - [`package.json`](../package.json): Vite, React 19, TypeScript, Vitest, Playwright, Tailwind v4.
  - Reproducible commands: `npm install`, `npm run dev`, `npm run build`, `npm run test`, `npx playwright test`.
  - [`README.md`](../README.md): Documented prerequisites, install steps, and architecture overview.

---

### Issue 3: Design a reusable hardware component definition schema
- **Labels:** `components` | **Priority:** Good foundation
- **Description:** Define a versioned manifest format for part identity, named pins, electrical properties, visual assets, and simulation behavior.
- **Done when:** The ESP32, TB6612FNG, N20 motor, and battery have validated example definitions.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - TypeScript Schema & Validator: [`src/parts/schema.ts`](../src/parts/schema.ts).
  - Validated manifests:
    - [`parts/mcu/esp32-devkit-v1/part.json`](../parts/mcu/esp32-devkit-v1/part.json)
    - [`parts/drivers/tb6612fng/part.json`](../parts/drivers/tb6612fng/part.json)
    - [`parts/actuators/n20-motor/part.json`](../parts/actuators/n20-motor/part.json)
    - [`parts/power/battery-pack-7v4/part.json`](../parts/power/battery-pack-7v4/part.json)
    - [`parts/sensors/hc-sr04/part.json`](../parts/sensors/hc-sr04/part.json)
  - Unit tests: [`test/parts-schema.test.ts`](../test/parts-schema.test.ts) (6 tests passing).

---

### Issue 4: Implement interactive pin-to-pin circuit wiring
- **Labels:** `circuit-editor` | **Priority:** Core feature
- **Description:** Allow users to place parts, connect labelled pins, reposition components, delete wires, and save circuit connectivity as structured data.
- **Done when:** Real connections form a graph, and disconnecting a wire updates that graph and its validation results.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - Canvas & Interactive Bezier Wires: [`src/circuit/CircuitCanvas.tsx`](../src/circuit/CircuitCanvas.tsx).
  - Transitive Netlist Graph & ERC Engine: [`src/circuit/CircuitEngine.ts`](../src/circuit/CircuitEngine.ts).
  - Verification: Unit tests in [`test/simulation.test.ts`](../test/simulation.test.ts) and E2E in [`test/e2e.spec.ts`](../test/e2e.spec.ts).

---

### Issue 5: Validate an ESP32 firmware runtime for GPIO, PWM, and serial output
- **Labels:** `firmware` | **Priority:** Technical risk
- **Description:** Evaluate a suitable runtime, compile a minimal Arduino sketch, and prove that firmware output reaches a typed event interface usable by the circuit simulator.
- **Done when:** A proof of concept demonstrates actual supported firmware execution, GPIO/PWM output, serial output, documented limitations, and license compatibility.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - Clean Contract: [`src/runtime/FirmwareRuntime.ts`](../src/runtime/FirmwareRuntime.ts).
  - Execution Engine: [`src/runtime/ESP32BehavioralRuntime.ts`](../src/runtime/ESP32BehavioralRuntime.ts) (executes `digitalWrite`, `ledcWrite`, `delay`, `Serial.println`).
  - Unit tests verifying timed step transitions and event emission in [`test/simulation.test.ts`](../test/simulation.test.ts).

---

### Issue 6: Implement the TB6612FNG motor-driver behavioral model
- **Labels:** `simulation` / `electronics`
- **Description:** Model direction, standby, PWM, logic power, motor supply, grounding, and invalid connections.
- **Done when:** Unit tests verify motor output behavior for valid and invalid wiring, including disabled standby and missing motor power.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - Truth table & power validation: [`src/circuit/TB6612FNGDriver.ts`](../src/circuit/TB6612FNGDriver.ts).
  - 3 test cases in [`test/simulation.test.ts`](../test/simulation.test.ts) covering standby, forward CW, and missing $V_M$ disconnect.

---

### Issue 7: Build the first code-driven 3D robot simulation
- **Labels:** `3D` / `robotics`
- **Description:** Create a chassis with two logical drive motors and connect its wheel rotation and movement to the motor model's outputs.
- **Done when:** Changing firmware PWM changes wheel behavior, reversing direction changes motion, and stopping the simulation stops the robot.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - First-order DC Motor Model: [`src/robot/MotorModel.ts`](../src/robot/MotorModel.ts).
  - Kinematic Differential Drive: [`src/robot/DifferentialDriveChassis.ts`](../src/robot/DifferentialDriveChassis.ts).
  - WebGL 3D Viewport with rotating wheels & camera controls: [`src/three/Robot3DViewport.ts`](../src/three/Robot3DViewport.ts).

---

### Issue 8: Add automated end-to-end simulation tests
- **Labels:** `testing` / `quality`
- **Description:** Automate the complete demo: load the project, run firmware, observe signals, verify robot movement, and test failure conditions.
- **Done when:** Browser tests verify the core workflow and detect regressions in wiring, motor behavior, console output, and reset.
- **Status:** **COMPLETED** ✅
- **Artifacts:**
  - Playwright browser test: [`test/e2e.spec.ts`](../test/e2e.spec.ts).
  - Full-page verification screenshot: [`test/magicsmoke_running_e2e.png`](../test/magicsmoke_running_e2e.png).
