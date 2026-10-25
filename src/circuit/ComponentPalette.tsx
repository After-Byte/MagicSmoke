import React, { useState } from 'react';
import { COMPONENT_CATALOG, CatalogCategory, CatalogItem } from './ComponentCatalog';
import { ComponentInstance } from './types';
import {
  Search,
  Plus,
  Cpu,
  Zap,
  Battery,
  Disc,
  Radio,
  Sliders,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface ComponentPaletteProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddComponent: (item: CatalogItem) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  isOpen,
  onToggle,
  onAddComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>('all');
  const [inspectedItem, setInspectedItem] = useState<CatalogItem | null>(null);

  const categories: { id: CatalogCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Parts', icon: <Sliders size={12} /> },
    { id: 'mcu', label: 'Microcontrollers', icon: <Cpu size={12} /> },
    { id: 'driver', label: 'Motor Drivers', icon: <Zap size={12} /> },
    { id: 'actuator', label: 'Actuators', icon: <Disc size={12} /> },
    { id: 'power', label: 'Power Sources', icon: <Battery size={12} /> },
    { id: 'sensor', label: 'Sensors', icon: <Radio size={12} /> },
  ];

  const filteredItems = COMPONENT_CATALOG.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (type: ComponentInstance['type']) => {
    switch (type) {
      case 'ESP32_DEVKIT_V1':
      case 'ARDUINO_UNO_R3':
        return <Cpu className="text-[#00f0ff]" size={18} />;
      case 'TB6612FNG':
        return <Zap className="text-amber-400" size={18} />;
      case 'N20_MOTOR':
      case 'SERVO_SG90':
      case 'SERVO_MG996R':
        return <Disc className="text-cyan-400" size={18} />;
      case 'BATTERY_PACK':
      case 'SERVO_POWER_SUPPLY':
        return <Battery className="text-emerald-400" size={18} />;
      case 'GROUND_BUS':
      case 'BREADBOARD':
        return <Sliders className="text-slate-400" size={18} />;
      case 'HC_SR04':
      case 'IR_SENSOR_ARRAY_8CH':
        return <Radio className="text-blue-400" size={18} />;
      default:
        return <Cpu className="text-[#00f0ff]" size={18} />;
    }
  };

  return (
    <>
      {/* Drawer Toggle Tab on Canvas Right Edge */}
      <button
        onClick={onToggle}
        className={`absolute top-12 right-2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-md shadow-xl transition-all ${
          isOpen
            ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/50'
            : 'bg-[#121722]/95 text-[#94a3b8] hover:text-[#e2e8f0] border-[#222e42] hover:border-[#00f0ff]/40'
        }`}
        title="Toggle Tinkercad-style Component Library Tray"
        data-testid="toggle-component-palette"
      >
        <Plus size={13} className={isOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
        <span className="font-semibold">Component Library</span>
        {isOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Slide-out Component Library Panel */}
      <aside
        style={{ width: isOpen ? '310px' : '0px' }}
        className={`absolute top-0 right-0 h-full bg-[#0e131d]/98 border-l border-[#1f283a] shadow-2xl flex flex-col z-20 transition-[width] duration-300 ease-out overflow-hidden select-none ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        data-testid="component-palette-drawer"
      >
        {/* Panel Header */}
        <div className="pt-14 px-3 pb-2.5 bg-[#131926] border-b border-[#1f283a] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-[#00f0ff]" />
              <span className="text-xs font-bold font-mono text-[#cbd5e1] tracking-wide">
                COMPONENTS
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#64748b]">
              {filteredItems.length} available
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full bg-[#0a0d14] border border-[#222d3d] focus:border-[#00f0ff]/60 rounded px-2.5 py-1 pl-8 text-xs font-mono text-[#e2e8f0] placeholder-[#64748b] outline-none transition-colors"
              data-testid="component-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#e2e8f0]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40'
                    : 'bg-[#182030] text-[#94a3b8] hover:text-[#e2e8f0] border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Component Cards List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-[#64748b]">
              No components match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="group p-2.5 rounded-lg bg-[#121824] hover:bg-[#162030] border border-[#1e293b] hover:border-[#2a3c56] transition-all flex flex-col gap-1.5 shadow-sm"
                data-testid={`catalog-card-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#182030] flex items-center justify-center border border-[#25334a] shrink-0">
                      {getCategoryIcon(item.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#e2e8f0] group-hover:text-[#00f0ff] transition-colors leading-tight">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                      item.simulationStatus === 'fully_simulated'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                    }`}
                  >
                    {item.simulationStatus === 'fully_simulated' ? 'Simulated' : 'Schematic'}
                  </span>
                </div>

                <p className="text-[11px] text-[#94a3b8] leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1b2536] text-[11px] font-mono">
                  <button
                    onClick={() => setInspectedItem(inspectedItem?.id === item.id ? null : item)}
                    className="flex items-center gap-1 text-[#64748b] hover:text-[#38bdf8] transition-colors"
                    title="View pinout and specifications"
                  >
                    <Info size={11} /> Specs
                  </button>

                  <button
                    onClick={() => onAddComponent(item)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#0a0d14] border border-[#00f0ff]/40 hover:border-transparent font-bold transition-all active:scale-95"
                    data-testid={`add-component-btn-${item.id}`}
                  >
                    <Plus size={12} /> Add to Circuit
                  </button>
                </div>

                {/* Expandable Specs Accordion */}
                {inspectedItem?.id === item.id && (
                  <div className="mt-1 p-2 rounded bg-[#0b0e15] border border-[#202c3f] text-[10px] font-mono space-y-1">
                    {item.specs.voltage && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Voltage:</span>
                        <span className="text-[#cbd5e1]">{item.specs.voltage}</span>
                      </div>
                    )}
                    {item.specs.current && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Current:</span>
                        <span className="text-[#cbd5e1]">{item.specs.current}</span>
                      </div>
                    )}
                    {item.specs.interfaces && (
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Ports:</span>
                        <span className="text-[#38bdf8] truncate max-w-[170px]">{item.specs.interfaces}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};
