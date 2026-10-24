import React, { useState } from 'react';
import { TopNavbar } from './TopNavbar';
import { LeftSidebar } from './LeftSidebar';
import { TinktoberBanner } from './TinktoberBanner';
import { WhatsNewCarousel } from './WhatsNewCarousel';
import { RecentDesignsCarousel } from './RecentDesignsCarousel';

interface DashboardViewProps {
  onNavigateToCircuits: (projectId?: string) => void;
  onOpenReferenceModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToCircuits,
  onOpenReferenceModal,
}) => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col font-sans select-none text-[#1b1a1a]">
      {/* Global Top Navbar */}
      <TopNavbar
        onNavigateToCircuits={() => onNavigateToCircuits('incredible-jofo-snaget')}
        onNavigateHome={() => setActiveTab('home')}
        activeView="dashboard"
      />

      {/* Main Layout: Left Sidebar + Center Dashboard Content */}
      <div className="flex grow overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Center Content Area */}
        <main className="grow overflow-y-auto px-4 sm:px-8 py-6 max-w-[1340px] mx-auto w-full">
          {/* Hero Banner: Take the Tinktober Challenge */}
          <TinktoberBanner />

          {/* What's New Carousel */}
          <WhatsNewCarousel />

          {/* Recent Designs Carousel */}
          <RecentDesignsCarousel onOpenProject={(id) => onNavigateToCircuits(id)} />
        </main>
      </div>
    </div>
  );
};
