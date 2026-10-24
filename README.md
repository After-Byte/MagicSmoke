<div align="center">
  <img src="MagicSmoke%20Logo1.png" alt="MagicSmoke — Electronics and Robotics Simulation" width="100%" />

  <h1>MagicSmoke</h1>

  <p><strong>Wire it. Code it. Watch it move.</strong></p>

  <p>An open-source playground for electronics, embedded systems, and 3D robotics simulation.</p>

  <p>
    <a href="#vision">Vision</a> ·
    <a href="#features">Features</a> ·
    <a href="#roadmap">Roadmap</a> ·
    <a href="#getting-started">Getting Started</a> ·
    <a href="#contributing">Contributing</a>
  </p>

  ![Status](https://img.shields.io/badge/status-early_development-orange)
  ![License](https://img.shields.io/badge/license-MIT-blue)
  ![Built with TypeScript](https://img.shields.io/badge/built_with-TypeScript-3178C6?logo=typescript&logoColor=white)
</div>

---

## Vision

Building a robot shouldn't require jumping between different tools just to test an idea.

MagicSmoke aims to bring **circuit design, embedded programming, and interactive 3D robotics simulation into one workspace**.

Design a circuit, write code, connect hardware, and eventually watch your virtual robot respond to its environment—all in one place.

## Features

MagicSmoke is actively evolving. Current implementations and future ambitions are intentionally separated.

- **Circuit editor** — Build circuits by connecting electronic components.
- **Code workspace** — Write embedded-style code within the project.
- **3D visualization** — Explore simulated hardware and robot assemblies.
- **Hardware modeling** — Develop component definitions and behavioral models.
- **Robotics simulation** — Work toward connecting firmware, sensors, motors, and robot movement.

> Not every capability is fully implemented. Hardware coverage, firmware compatibility, and simulation accuracy are still evolving.

## Roadmap

### 01 — A reliable foundation
- Improve circuit wiring and component interactions.
- Establish consistent project state management.
- Add automated tests for critical workflows.
- Refine the workbench UI and error handling.

### 02 — A growing hardware library
- Add sensors, actuators, and board definitions.
- Document GPIO capabilities and electrical constraints.
- Standardize component models for community contributions.

### 03 — Connected code and simulation
- Connect GPIO and PWM output to simulated hardware.
- Integrate sensor readings with firmware behavior.
- Improve motor control and robot movement.
- Expand simulation testing and runtime capabilities.

### 04 — Richer robotics environments
- Introduce interactive environments and obstacles.
- Improve collision handling and physics.
- Explore navigation, path planning, and autonomous behavior.

### 05 — An open simulation ecosystem
- Add project saving, loading, and sharing.
- Support extensible component libraries.
- Improve documentation and contributor workflows.
- Explore additional microcontroller runtimes.

*This roadmap is directional; priorities may change as the project develops.*

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
git clone https://github.com/After-Byte/MagicSmoke.git
cd MagicSmoke
npm install
npm run dev
```

Open the local URL printed in your terminal, typically `http://localhost:5173`.

### Testing

```bash
npm run test
npx playwright test
```

Some features and tests may still be under development.

## Project Architecture

MagicSmoke is built with TypeScript and a modular architecture intended to bring together:

- **Workbench UI** — Circuit editing and code authoring.
- **Circuit engine** — Connections, electrical checks, and signal evaluation.
- **Runtime layer** — Firmware-style execution and hardware interaction.
- **3D engine** — Hardware visualization and robot behavior.

The architecture is evolving alongside the simulator. Runtime behavior should not be assumed to provide complete emulation of physical microcontrollers.

## Contributing

MagicSmoke is open source, and contributions are welcome!

You can help by:
- Reporting bugs and suggesting features.
- Adding component definitions and hardware models.
- Improving documentation and automated tests.
- Contributing to the circuit engine, runtime, or 3D simulation.

Please open an issue before starting substantial changes so we can discuss the approach.

## Project Status

**Early development — experimental software.**

Expect incomplete features, changing APIs, and simulation limitations. Feedback and contributions will help shape the project.

## License

MagicSmoke is released under the [MIT License](LICENSE).
