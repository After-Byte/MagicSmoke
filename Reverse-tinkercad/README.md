# Reverse-Engineered Autodesk Tinkercad Web Application

This project is a high-fidelity reverse-engineered implementation of **Autodesk Tinkercad**, accurately replicating both the **Dashboard** and the **Circuits + Code Editor** interfaces provided in the user's reference screenshots.

Location: `C:\dev\MagicSmoke\Reverse-tinkercad`

---

## 🌟 Pages & Features Implemented

### 1. Dashboard Page (`/` or `#dashboard`) — Matching Photo 2
- **Autodesk Tinkercad Top Navigation Bar**:
  - Official Tinkercad 3×3 colorful block grid logo + "AUTODESK Tinkercad" wordmark
  - Navigation menus: `Tinker` (dropdown with 3D Designs, Circuits, Codeblocks), `Gallery`, `Learn`, `Teachers`, `Resources` (dropdown)
  - Quick Search bar with expanding input
  - `+ Create` pill button with dropdown menu
  - User profile avatar
- **Left Icon Navigation Sidebar**:
  - User avatar
  - Active `Home` icon with official blue circular ring indicator
  - `Classes` (Apple icon), `Designs` (4-grid icon), `Collections` (Folder icon), `Tutorials` (Graduation cap), `Challenges` (Flag)
  - Expand/collapse toggle pill on sidebar edge
  - `Help` (?) button at the bottom
- **"Take the Tinktober Challenge" Hero Card**:
  - Left column: Spooky Halloween artwork with dark slate texture, glowing harvest moon, spiderwebs, hanging spiders, flying bats, chalk-style "Join us for Tinktober!" and "31 days of designing with Autodesk Tinkercad" ribbon
  - Right column: "Take the Tinktober Challenge" heading, descriptive copy, and "Join the challenge" interactive pill button
- **"What's New" Carousel**:
  - Lightbulb icon + `[View all]` pill + `<` and `>` carousel buttons
  - 5 feature cards with accurate vector illustrations matching Photo 2:
    1. *New Measure tool - easily check and edit distances.*
    2. *Email verification coming soon if you sign in with email.*
    3. *Introducing Tinkercad Robotics.*
    4. *Codeblocks Shapes: Build Once, Customize in 3D.*
    5. *Take Control of your Codeblocks designs.*
- **"Recent Designs" Carousel**:
  - Cube icon + `[View all]` pill + `<` and `>` carousel buttons
  - Hero card: **"Incredible Jofo-Snaget"** (Circuits project with thumbnail of Arduino Uno + Breadboard). Clicking it opens the Circuits workspace!
  - Other recent designs ("Glowing Robos-Gogo", "Spooky Haunted Castle", etc.) with "Tinker this" hover overlay

---

### 2. Circuits + Code Editor Page (`#circuits`) — Matching Photo 1
- **Circuits Header**:
  - Tinkercad 3×3 colorful logo (returns to dashboard on click)
  - Editable project title pill: **"Incredible Jofo-Snaget"**
  - View switcher segmented control: `[Circuits]` (active), `[Schematic]`, `[Components]`
  - User profile avatar
- **Circuits Secondary Toolbar**:
  - Left tools: Rotate (90° CW), Delete/Trash, Undo, Redo, Notes annotation, Toggle notes visibility
  - Wire Color picker with official Tinkercad wire palette (default green `#22c55e` matching Photo 1)
  - Wire type selector: Normal, Hookup, Alligator
  - Flip Horizontal, Flip Vertical
  - Right actions:
    - `[</> Code]` active button (toggles code panel open/closed)
    - `[> Start Simulation]` button (executes the Arduino sketch, blinks the LED, logs to serial)
    - `[Send To]` export button
- **Circuit Canvas**:
  - Floating zoom-to-fit bracket button `[ ]`, zoom in, zoom out, pan
  - **Arduino Uno R3**:
    - High-fidelity vector board with Italian teal PCB, ATmega328P DIP-28 chip, crystal oscillator, reset button, pin headers
    - **Black USB Cable** plugged into the left USB-B port with molded strain relief and trailing cord (matching Photo 1!)
    - Built-in LEDs: `ON` power LED, `L` LED (pin 13 LED that blinks in real-time with code!), `TX`/`RX` communication LEDs
    - Interactive pin receptacles with tooltips and wire snapping
  - **Half-Size Breadboard**:
    - Placed adjacent to Arduino Uno
    - Top & bottom power rails (+ red line, - blue line)
    - Row numbers 1 to 30, column letters a–e and f–j
    - Clickable tie-point holes
  - **Interactive Wires**:
    - Click any pin on Arduino or Breadboard to stretch and route smooth bezier curved wires with the selected color!
- **Code Editor Panel (Right Side)**:
  - Header: Mode dropdown (`Text`), Download `.ino` sketch, Copy code, Font size toggle (`A±`), Target board dropdown (`1 (Arduino Uno R3)`)
  - Line numbers: 1 to 14
  - Exact C++ Arduino sketch from Photo 1 with syntax highlighting:
    ```cpp
    // C++ code
    //
    void setup()
    {
      pinMode(LED_BUILTIN, OUTPUT);
    }

    void loop()
    {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(1000); // Wait for 1000 millisecond(s)
      digitalWrite(LED_BUILTIN, LOW);
      delay(1000); // Wait for 1000 millisecond(s)
    }
    ```
  - **Serial Monitor Drawer**:
    - Bottom bar matching Photo 1: `[icon] Serial Monitor [chevron]`
    - Expandable drawer with text input, Send button, 9600 baud rate selector, Clear button, and streaming log messages!

---

## 🚀 How to Run

From this directory (`C:\dev\MagicSmoke\Reverse-tinkercad`):

```bash
# Start development server
npm run dev

# Or run the production preview
npm run preview
```

Open your browser at:
- **Dashboard**: `http://localhost:5174/`
- **Circuits Editor**: `http://localhost:5174/#circuits`

### Quick Navigation
Use the floating dock at the bottom-right corner to toggle instantly between:
1. **Dashboard**
2. **Circuits + Code**
3. **Reference Screenshot Comparison modal** (compares with the original user screenshots)
