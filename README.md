<p align="center">
  <img src="MagicSmoke%20Logo1.png" alt="MagicSmoke logo" width="220" />
</p>

<h1 align="center">MagicSmoke</h1>

<p align="center">
  <strong>Wire it. Code it. Watch it move.</strong>
</p>

<p align="center">
  An open-source playground for electronics, embedded systems, and robotics simulation.
</p>

<p align="center">
  <a href="#vision">Vision</a> ·
  <a href="#current-capabilities">Capabilities</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-early%20development-orange" alt="Early development" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/built%20with-TypeScript-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/contributions-welcome-brightgreen" alt="Contributions welcome" />
</p>

---

## What is MagicSmoke?

Building a robot shouldn't require jumping between five different tools just to find out whether your idea works.

You might design a circuit in one application, write firmware in another, simulate robot movement somewhere else, and then spend hours trying to understand why everything behaves differently when connected together.

**MagicSmoke aims to bring electronics, embedded programming, and 3D robotics simulation into one workspace.**

Build a circuit. Connect sensors and actuators. Write code. Run a simulation. Observe how your hardware and robot interact with the world.

The goal is to make experimentation with robotics more accessible, more visual, and more connected to the way real hardware works.

MagicSmoke is under active development. Its current capabilities are an initial foundation for this larger vision.

## Vision

### One workspace. From circuit to robot.

MagicSmoke is being designed around the idea that a robot is more than a 3D model.

Its behavior emerges from the interaction between electrical connections, embedded code, sensors, actuators, and the physical environment.

We want to bring these pieces together.

### Electronics that matter

A circuit should be more than a collection of connected lines.

Pin assignments, voltage compatibility, power rails, common grounds, and peripheral capabilities should influence whether a simulated system works.

The long-term goal is to make circuit construction meaningful rather than simply visual.

### A world that responds

Sensors should eventually interact with the simulated environment.

An ultrasonic sensor should measure the distance to an object. A robot should respond to its motor-control signals. Its movement should depend on its controller and the behavior of its simulated hardware.

Instead of treating electronics and 3D simulation as separate experiences, MagicSmoke aims to connect them.

### An open, extensible hardware library

No simulator can include every component.

MagicSmoke aims to make adding hardware straightforward through reusable component definitions, 3D models, pin descriptions, and behavioral implementations.

The community should be able to extend the simulator without needing to rewrite its core engine for every new sensor or module.

### Built for learning and experimentation

Whether you're building your first Arduino project, experimenting with embedded systems, or developing a robotics prototype, MagicSmoke aims to provide a place to test ideas before committing to physical hardware.

The long-term ambition is to make the journey from a circuit diagram to a moving robot feel like one continuous process.

---

## Current capabilities

MagicSmoke is in early development. The following describes the implementation currently represented in the codebase, not a claim that every part of the complete vision is finished.

### Circuit editor

- Interactive circuit workspace with draggable components.
- Pin-to-pin wiring and wire deletion.
- Canvas panning and zooming.
- Circuit connectivity evaluation through a netlist.
- Initial electrical checks for missing common grounds and unpowered motor-driver supplies.

### Embedded code workspace

- Monaco-based code editor.
- Initial ESP32-oriented behavioral runtime for a supported subset of Arduino-style C++.
- Support for selected GPIO operations, PWM output, serial output, and asynchronous execution.
- Runtime abstraction intended to support additional execution backends in the future.

**Important:** The existing behavioral runtime is not equivalent to executing arbitrary firmware on a complete emulated microcontroller. Check the runtime implementation for the currently supported operations and limitations.

### Motors and robotics

- Initial TB6612FNG dual H-bridge driver model.
- N20 motor behavior with acceleration and deceleration damping.
- Differential-drive robot kinematics.
- A Three.js-based 3D viewport with an initial procedural robot and hardware representation.

### Integrated workbench

- Code editor and circuit workspace.
- Expandable 3D simulation viewport.
- Diagnostics interface.
- Responsive layouts for narrower screens.

These capabilities establish the foundation for connecting circuit construction, code execution, and robot behavior more closely.

---

## Roadmap

The roadmap describes the direction of the project. Items are goals, not promises that the features already exist or have a fixed delivery date.

### Phase 1 — Build a reliable foundation

**Focus: correctness, architecture, and developer experience.**

- [ ] Improve circuit wiring interactions and connection reliability.
- [ ] Establish a consistent project-state model.
- [ ] Expand automated tests for critical workflows.
- [ ] Improve error reporting and simulation lifecycle handling.
- [ ] Document the architecture and development workflow.
- [ ] Improve the workbench's visual consistency and usability.

### Phase 2 — Expand the hardware library

**Focus: reusable components and accurate hardware definitions.**

- [ ] Establish a consistent schema for hardware components.
- [ ] Add documented pin capabilities for supported microcontrollers.
- [ ] Expand the library of sensors, actuators, and modules.
- [ ] Improve electrical compatibility validation.
- [ ] Standardize component metadata and 3D asset conventions.
- [ ] Make it easier for contributors to add and validate new components.

### Phase 3 — Connect code, circuits, and simulation

**Focus: meaningful interaction between simulated hardware and software.**

- [ ] Strengthen the interface between firmware execution and simulated hardware.
- [ ] Connect supported GPIO and PWM operations to circuit behavior.
- [ ] Connect simulated sensor readings to supported programs.
- [ ] Improve motor-driver and actuator integration.
- [ ] Validate the complete code-to-hardware-to-robot workflow.
- [ ] Expand runtime capabilities based on a clearly documented execution model.

### Phase 4 — Build richer robotics environments

**Focus: interactive worlds and more capable robots.**

- [ ] Introduce configurable environments and obstacles.
- [ ] Improve sensor interaction with the simulated world.
- [ ] Expand robot configurations and actuator models.
- [ ] Improve collision handling and physical behavior.
- [ ] Support more sophisticated robotics experiments.
- [ ] Explore navigation, path planning, and autonomous behavior workflows.

### Phase 5 — Make projects shareable and extensible

**Focus: collaboration and long-term usability.**

- [ ] Implement reliable project saving and restoration.
- [ ] Establish versioned project serialization.
- [ ] Improve project import and export workflows.
- [ ] Create a documented component contribution process.
- [ ] Explore community-contributed hardware and robot libraries.
- [ ] Investigate additional firmware execution backends where practical.

The roadmap will evolve as the project develops, technical constraints become clearer, and contributors help identify the most valuable next steps.

---

## Architecture

MagicSmoke is built with TypeScript and uses a modular approach to separate the workbench, circuit evaluation, runtime, robot behavior, and 3D rendering.

The current implementation includes the following major areas:

| Area | Responsibility |
|---|---|
| `src/` | Application and workbench implementation |
| `src/project/` | Default project configuration |
| `src/runtime/` | Firmware runtime abstractions and behavioral execution |
| `src/circuit/` | Circuit connectivity, netlist evaluation, and electrical rules |
| `src/robot/` | Motor behavior and robot kinematics |
| `src/three/` | Three.js rendering and 3D viewport |
| `parts/` | Hardware component definitions and associated assets, where implemented |

Example component structure:

```text
parts/
└── sensors/
    └── hc-sr04/
        ├── mesh.glb
        ├── part.json
        └── behavior.ts
```

This illustrates the intended component organization. The exact files and requirements should be checked against the component implementation and contribution guidelines before adding new parts.

The architectural goal is to keep hardware definitions modular, make simulation behavior testable, and allow new components to be introduced without unnecessary changes to unrelated parts of the application.

---

## Getting started

### Prerequisites

- Node.js 18 or later.
- npm.
- A modern browser with WebGL support.

The project has also been tested with newer Node.js and npm versions.

### Installation

Clone the repository:

```bash
git clone https://github.com/After
