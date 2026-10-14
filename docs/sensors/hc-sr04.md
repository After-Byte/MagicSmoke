{
  "id": "hc-sr04",
  "name": "HC-SR04 Ultrasonic Distance Sensor",
  "category": "sensor",
  "operating_voltage": { "min": 4.5, "typical": 5.0, "max": 5.5 },
  "protocol": "GPIO_PULSE",
  "pins": [
    { "name": "VCC", "type": "power", "description": "5V Power Supply" },
    { "name": "TRIG", "type": "digital_in", "description": "Trigger input pulse (10us)" },
    { "name": "ECHO", "type": "digital_out", "description": "Echo output pulse proportional to distance" },
    { "name": "GND", "type": "ground", "description": "Ground" }
  ],
  "simulation_inputs": ["distance_cm"]
}
