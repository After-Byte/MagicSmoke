<p align="center">
  <img src="MagicSmoke%20Logo1.png" alt="MagicSmoke Banner" width="100%" />
</p>

<br />
# MagicSmoke

An open-source 3D sandbox for wiring sensors, running real microcontroller code, and testing robotics in a physics environment.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: Work in Progress](https://img.shields.io/badge/status-WIP-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

---

## Why I'm building this
I'm a robotics student, and I got tired of the current state of simulation tools. Right now, you basically have to pick your poison:
1. **2D circuit simulators (Wokwi, Tinkercad, Fritzing):** Great for hooking up an Arduino to an LED or a basic ultrasonic sensor. Terrible the moment you want to put those parts on a moving 3D chassis, test spatial physics, or use a sensor that isn't in their tiny default catalog.
2. **3D robotics simulators (Gazebo, Webots, CoppeliaSim):** Great physics and ROS integration, but they completely abstract away the electronics. You don't wire pins, you don't deal with I2C addresses or pull-up resistors, and you aren't running raw microcontroller firmware.

There is no single tool where you can grab a microcontroller, wire up 15 different IoT and robotics sensors pin-by-pin, flash your actual code, and watch it interact with a 3D world. 
So I'm building one

## What it does (and will do)
* **Actual pin-to-pin wiring in 3D:** Connect jumper wires between boards, breadboards, and sensors. If you wire `SDA` and `SCL` backwards or forget a common ground, it won't work—just like real hardware.
* **No more faking sensor data with sliders:** Instead of dragging a UI slider to test an ultrasonic or ToF distance sensor, you place a 3D wall in front of the sensor and let raycasting calculate the real distance.
* **A sensor library that doesn't suck:** The biggest goal of this repo is making it dead simple for anyone to add new parts. If a sensor exists on AliExpress or Adafruit, it should be easy to drop into this simulator.
* **Real firmware execution:** Write standard C/C++ (Arduino/ESP-IDF) or MicroPython and run it against emulated MCUs.

## How parts are structured
To keep the component library massive, adding a new sensor shouldn't require touching the core engine code. Every part in `MagicSmoke` is just a folder with three things:

```text
parts/sensors/hc-sr04/
├── mesh.glb        # Low-poly 3D model with named empties for pins
├── part.json       # Pin definitions, voltage limits, communication protocol
└── behavior.ts     # How the part interacts with the 3D world (e.g., raycast -> pulse ECHO pin)
```

---

## Getting Started

### Prerequisites
- Node.js v18+ (tested on Node v24.14.1, npm 11.11.0)

### Installation & Running Locally
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run Vitest unit test suite (Circuit engine, TB6612FNG, N20 Motor model, Kinematics)
npm run test

# Run Playwright end-to-end browser tests
npx playwright test
```

Open `http://localhost:5173` in your browser.

---

## Architecture & Hardware Simulation Model

1. **Firmware Runtime (`src/runtime/`):**
   - Clean `FirmwareRuntime` adapter interface for hardware/behavioral MCU targets.
   - Initial reference target: `ESP32BehavioralRuntime` simulating Arduino C++ with `ledcWrite()`, `digitalWrite()`, `Serial`, and asynchronous timer steps.

2. **Circuit Engine & Netlist (`src/circuit/`):**
   - Transitive graph evaluation of connected nets.
   - Electrical rules check (missing common ground between logic & battery, unpowered VCC/VM detection).
   - Dynamic wire drawing with interactive bezier curves, pin dragging, and wire deletion.

3. **Motor Driver & Actuators (`src/circuit/TB6612FNGDriver.ts` & `src/robot/`):**
   - Toshiba TB6612FNG dual H-bridge truth table with slow-decay PWM response.
   - Electromechanical N20 micro-gear motor model with acceleration/deceleration damping.
   - Kinematic differential-drive chassis translation and yaw rotation.

4. **3D Viewport (`src/three/`):**
   - Procedural robot chassis, battery pack, ESP32 module, TB6612FNG board, and rotating wheels rendered with Three.js WebGL and PCF soft shadows.
   - Custom mouse orbit, pan, and zoom controls with reset capabilities.
