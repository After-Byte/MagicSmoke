import React, { useState, useEffect } from 'react';
import { DashboardView } from './components/dashboard/DashboardView';
import { CircuitsEditorView } from './components/circuits/CircuitsEditorView';
import { ReferenceComparisonModal } from './components/common/ReferenceComparisonModal';
import { LayoutDashboard, Cpu, Image as ImageIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'circuits'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#circuits' || hash === '#editor') return 'circuits';
      if (hash === '#dashboard') return 'dashboard';
    }
    return 'dashboard';
  });

  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  // Sync with browser hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#circuits' || hash === '#editor') {
        setCurrentView('circuits');
      } else {
        setCurrentView('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: 'dashboard' | 'circuits') => {
    setCurrentView(view);
    window.location.hash = view === 'circuits' ? '#circuits' : '#dashboard';
  };

  return (
    <div className="relative min-h-screen bg-[#f9fafb]">
      {/* Active Page View */}
      {currentView === 'dashboard' ? (
        <DashboardView
          onNavigateToCircuits={() => navigateTo('circuits')}
          onOpenReferenceModal={() => setIsReferenceModalOpen(true)}
        />
      ) : (
        <CircuitsEditorView
          onNavigateHome={() => navigateTo('dashboard')}
          onOpenReferenceModal={() => setIsReferenceModalOpen(true)}
        />
      )}

      {/* Floating Quick View Switcher Dock (Bottom-Right) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 bg-neutral-900/90 text-white p-1.5 rounded-full shadow-2xl backdrop-blur-md border border-white/20 select-none">
        <button
          onClick={() => navigateTo('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            currentView === 'dashboard'
              ? 'bg-[#0175da] text-white shadow-xs'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title="Switch to Dashboard (Photo 2)"
        >
          <LayoutDashboard size={14} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => navigateTo('circuits')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            currentView === 'circuits'
              ? 'bg-[#0175da] text-white shadow-xs'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          title="Switch to Circuits + Code (Photo 1)"
        >
          <Cpu size={14} />
          <span>Circuits + Code</span>
        </button>

        <div className="h-4 w-[1px] bg-white/20 mx-1" />

        <button
          onClick={() => setIsReferenceModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Compare with Reference Screenshot"
        >
          <ImageIcon size={14} />
          <span>Reference</span>
        </button>
      </div>

      {/* Reference Screenshot Comparison Modal */}
      <ReferenceComparisonModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        currentView={currentView}
      />
    </div>
  );
};
