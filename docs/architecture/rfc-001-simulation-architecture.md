# RFC 001: MagicSmoke Simulation Architecture & MVP

**Status:** Accepted & Implemented  
**Date:** October 2026  
**Scope:** Architecture, System Boundaries, Data Flow, Firmware Runtime, and MVP Definition  

---

## 1. Context & Motivation

Microcontroller and robotics developers currently must choose between:
1. **2D Circuit Simulators (Wokwi, Tinkercad):** Good at pin-level wiring and MCU emulation, but unable to simulate moving chassis, spatial physics, or multi-dimensional sensor interactions in 3D.
2. **3D Robotics Simulators (Gazebo, Webots):** Accurate physics and kinematic dynamics, but abstract away the electronics: no real pin-to-pin wiring, no logic-level bus handling, and no firmware-driven GPIO/PWM co-simulation.

**MagicSmoke** bridges this gap:
> *"Wire it. Code it. Watch it move in 3D."*

---

## 2. System Boundaries & Architecture

MagicSmoke is organized into decoupled layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MagicSmoke IDE (Browser)                        │
│                                                                        │
│   ┌─────────────────────┐    ┌──────────────────────────────────────┐  │
│   │     Code Editor     │    │       Circuit Wiring Workspace       │  │
│   │   (Monaco Editor)   │    │  (Graph-based SVG/Canvas netlist)    │  │
│   └──────────┬──────────┘    └──────────────────┬───────────────────┘  │
│              │ source                           │ pin-to-pin wires     │
│              ▼                                  │                      │
│   ┌─────────────────────┐                       │                      │
│   │  Firmware Runtime   │                       │                      │
│   │   (Adapter API)     ├───────┐               │                      │
│   └─────────────────────┘       │               │                      │
│                                 ▼               ▼                      │
│                      ┌────────────────────────────────────┐            │
│                      │       Circuit Engine (Netlist)     │            │
│                      │  - Transitive net evaluation       │            │
│                      │  - Common ground & rail validation │            │
│                      └──────────────────┬─────────────────┘            │
│                                         │ drive signals                │
│                                         ▼                              │
│                      ┌────────────────────────────────────┐            │
│                      │    Component & Driver Models       │            │
│                      │  - TB6612FNG H-Bridge Logic        │            │
│                      │  - N20 First-Order DC Dynamics     │            │
│                      └──────────────────┬─────────────────┘            │
│                                         │ wheel linear velocities      │
│                                         ▼                              │
│   ┌─────────────────────┐    ┌──────────────────────────────────────┐  │
│   │  Telemetry & Logs   │    │      3D Viewport & Kinematics        │  │
│   │  - Serial console   │◄───┤  - Three.js WebGL Scene              │  │
│   │  - Circuit alerts   │    │  - Differential drive kinematics     │  │
│   └─────────────────────┘    └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Specification

1. **Compilation & Initialization:**
   - The user writes Arduino C++ sketch in the editor.
   - On **Compile & Run**, the firmware runtime compiles/interprets the code, registers pins (`pinMode`, `ledcAttach`), and boots.
2. **Signal Generation (Runtime $\to$ Circuit):**
   - Instructions like `digitalWrite(pin, state)` and `ledcWrite(pin, duty)` emit events via the `FirmwareRuntimeEvents` contract.
   - The `SimulationCoordinator` receives these events and sets the corresponding output states on the MCU component's pins.
3. **Net Propagation & Electrical Validation:**
   - `CircuitEngine` traverses the wire graph to compute electrical nets.
   - It verifies power rail continuity ($V_{CC} = 3.3\text{V}$, $V_M = 7.4\text{V}$) and common ground continuity between ESP32, Battery, and TB6612FNG.
   - If common ground or motor supply is broken, control signals produce high-impedance or zero voltage at the driver terminals.
4. **Driver State & Motor Kinematics:**
   - The `TB6612FNGDriver` reads inputs (`STBY`, `AIN1`, `AIN2`, `PWMA`, `BIN1`, `BIN2`, `PWMB`) from the netlist.
   - It computes channel operating modes (`FORWARD_CW`, `REVERSE_CCW`, `SHORT_BRAKE`, `STANDBY`) and requested motor RPM.
   - `N20MotorModel` simulates motor inertia, acceleration ($600\text{ RPM/s}$), and braking ($1200\text{ RPM/s}$).
5. **3D World Kinematics & Rendering:**
   - `DifferentialDriveChassis` transforms wheel linear velocities ($v_L, v_R$) into robot translation $(x, z)$ and yaw rotation $\theta$:
     $$v = \frac{v_R + v_L}{2}, \quad \omega = \frac{v_R - v_L}{L}$$
   - Three.js WebGL viewport renders the robot, chassis, and rotating wheels at display rate.
6. **Diagnostics & Telemetry:**
   - Serial monitor captures firmware prints (`Serial.println`).
   - Motor telemetry displays live RPM, voltages, and driver modes.

---

## 4. Firmware Runtime Strategy & Evaluation

| Option | Architecture | Feasibility | Current Status in MagicSmoke |
| :--- | :--- | :--- | :--- |
| **`ESP32BehavioralRuntime`** | Client-side AST & Event Dispatcher | 100% native, instant compilation, 0 backend needed | **Implemented & Default** |
| **`avr8js`** | Cycle-accurate 8-bit AVR RISC | Pure TypeScript, mature, Wokwi engine | Ready for AVR/Uno boards |
| **`rp2040js`** | 32-bit ARM Cortex-M0+ | Pure TypeScript, boots MicroPython REPL | Candidate for 32-bit Python |
| **`espressif/esp-emulator`** | RISC-V / Xtensa WASM | Emerging (Espressif official Rust/WASM) | Planned v2 for binary `.bin` flash |

### Behavioral Runtime Disclosure:
The initial milestone uses `ESP32BehavioralRuntime`. It parses standard Arduino C++ sketches, executes `setup()` and `loop()`, handles `digitalWrite`, `ledcWrite`, `delay`, and `Serial`, and fires real discrete events to the circuit netlist. It is abstracted behind `FirmwareRuntime`, allowing binary-level emulators to be swapped in seamlessly.

---

## 5. Definition of MVP (First Demonstration)

The MVP is satisfied when:
1. An editable Arduino sketch controls 2 motor channels via a TB6612FNG.
2. The user connects or disconnects real wires on an interactive canvas.
3. When the user compiles and runs:
   - Serial monitor displays boot and runtime messages.
   - Disconnecting battery ground or logic power halts motor movement with diagnostic feedback.
   - When properly wired, changing PWM duty cycle directly alters wheel rotation speed and robot translation in 3D.
4. Unit and end-to-end browser tests run automatically and pass.
