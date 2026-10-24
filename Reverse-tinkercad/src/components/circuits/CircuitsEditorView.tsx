import React, { useState, useEffect, useRef } from 'react';
import { CircuitsHeader } from './CircuitsHeader';
import { CircuitsToolbar } from './CircuitsToolbar';
import { CircuitCanvas } from './CircuitCanvas';
import { CodeEditorPanel } from './CodeEditorPanel';
import { Wire } from './WireLayer';
import { ArduinoSimulator } from '../../simulation/ArduinoSimulator';

interface CircuitsEditorViewProps {
  onNavigateHome: () => void;
  onOpenReferenceModal?: () => void;
}

const DEFAULT_ARDUINO_CODE = `// C++ code
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
`;

export const CircuitsEditorView: React.FC<CircuitsEditorViewProps> = ({
  onNavigateHome,
  onOpenReferenceModal,
}) => {
  const [projectTitle, setProjectTitle] = useState('Incredible Jofo-Snaget');
  const [currentMode, setCurrentMode] = useState<'circuits' | 'schematic' | 'components'>('circuits');

  // Toolbar state
  const [wireColor, setWireColor] = useState<string>('#22c55e'); // Green wire (matching Photo 1!)
  const [wireType, setWireType] = useState<'normal' | 'hookup' | 'alligator'>('normal');
  const [isCodeOpen, setIsCodeOpen] = useState<boolean>(true); // Code panel OPEN matching Photo 1!
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [notesVisible, setNotesVisible] = useState<boolean>(true);

  // Wires on canvas
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Code editor state
  const [code, setCode] = useState<string>(DEFAULT_ARDUINO_CODE);
  const [serialLogs, setSerialLogs] = useState<string[]>([
    'Tinkercad Circuits v2026 Engine Ready.',
    'Board: Arduino Uno R3 detected via USB Serial Port.',
  ]);

  // Built-in LED State (Pin 13)
  const [ledBuiltinState, setLedBuiltinState] = useState<boolean>(false);

  // Simulator Instance
  const simulatorRef = useRef<ArduinoSimulator | null>(null);

  useEffect(() => {
    simulatorRef.current = new ArduinoSimulator(
      (state) => setLedBuiltinState(state),
      (log) => setSerialLogs((prev) => [...prev, log])
    );

    return () => {
      simulatorRef.current?.stop();
    };
  }, []);

  const handleToggleSimulation = () => {
    if (isSimulating) {
      simulatorRef.current?.stop();
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      simulatorRef.current?.start(code);
    }
  };

  const handleSendMessage = (msg: string) => {
    simulatorRef.current?.sendSerialInput(msg);
  };

  const handleDelete = () => {
    if (selectedWireId) {
      setWires(wires.filter((w) => w.id !== selectedWireId));
      setSelectedWireId(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // If not actively typing inside textarea or input
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          handleDelete();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWireId, wires]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f2f3f5] overflow-hidden select-none">
      {/* 1. Header with title "Incredible Jofo-Snaget" and mode tabs */}
      <CircuitsHeader
        title={projectTitle}
        onTitleChange={setProjectTitle}
        onNavigateHome={onNavigateHome}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
      />

      {/* 2. Sub-Toolbar with circuit tools & simulation controls */}
      <CircuitsToolbar
        wireColor={wireColor}
        onWireColorChange={setWireColor}
        wireType={wireType}
        onWireTypeChange={setWireType}
        isCodeOpen={isCodeOpen}
        onToggleCode={() => setIsCodeOpen(!isCodeOpen)}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        onDelete={handleDelete}
        notesVisible={notesVisible}
        onToggleNotesVisibility={() => setNotesVisible(!notesVisible)}
      />

      {/* 3. Main Workspace Area: Canvas (Left) + Code Panel (Right) */}
      <div className="grow flex overflow-hidden relative">
        {/* Main Circuit Canvas */}
        <CircuitCanvas
          isSimulating={isSimulating}
          ledBuiltinState={ledBuiltinState}
          wireColor={wireColor}
          wireType={wireType}
          wires={wires}
          onWiresChange={setWires}
          selectedWireId={selectedWireId}
          onSelectWire={setSelectedWireId}
        />

        {/* Code Panel on the right (matching Photo 1!) */}
        {isCodeOpen && (
          <CodeEditorPanel
            code={code}
            onCodeChange={setCode}
            serialLogs={serialLogs}
            onSendMessage={handleSendMessage}
            onClearLogs={() => setSerialLogs([])}
            isSimulating={isSimulating}
          />
        )}
      </div>
    </div>
  );
};
