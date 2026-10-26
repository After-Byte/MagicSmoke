import React, { useState, useEffect } from 'react';
import {
  StoredProject,
  getAllStoredProjects,
  saveStoredProject,
  duplicateStoredProject,
  deleteStoredProject,
  renameStoredProject,
  createNewBlankCircuit,
} from '../project/projectStorage';
import { validateProjectDocument } from '../project/types';
import { CircuitThumbnail } from './CircuitThumbnail';
import { DashboardTopNavbar } from './DashboardTopNavbar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeroBanner } from './DashboardHeroBanner';
import { DashboardWhatsNewCarousel } from './DashboardWhatsNewCarousel';
import { DashboardRecentCarousel } from './DashboardRecentCarousel';
import { AtmosphericBackground } from './textures/AtmosphericBackground';
import {
  Cpu,
  Plus,
  SlidersHorizontal,
  Clock,
  Layers,
  Copy,
  Trash2,
  Edit2,
  ArrowRight,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Play,
  Terminal,
} from 'lucide-react';

interface DashboardProps {
  onOpenProject: (project: StoredProject) => void;
  hasActiveSession?: boolean;
  onReturnToEditor?: () => void;
  onLaunchLineFollowerLab?: (project?: StoredProject) => void;
  onLaunchRobotArmLab?: (project?: StoredProject) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenProject,
  hasActiveSession,
  onReturnToEditor,
  onLaunchLineFollowerLab,
  onLaunchRobotArmLab,
}) => {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'custom' | 'starters'>('all');
  const [sortBy, setSortBy] = useState<'modified' | 'title' | 'created'>('modified');

  // Inline rename state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Delete confirmation modal state
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const reloadProjects = () => {
    const list = getAllStoredProjects();
    setProjects(list);
  };

  useEffect(() => {
    reloadProjects();
  }, []);

  // Compute aggregate counts
  const totalParts = projects.reduce((acc, p) => acc + p.document.components.length, 0);
  const totalWires = projects.reduce((acc, p) => acc + p.document.wires.length, 0);
  const customCount = projects.filter((p) => !p.isStarter).length;
  const starterCount = projects.filter((p) => p.isStarter).length;

  // Filter & Sort logic
  const filteredProjects = projects
    .filter((p) => {
      if (filterTab === 'custom' && p.isStarter) return false;
      if (filterTab === 'starters' && !p.isStarter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'modified') return b.updatedAt - a.updatedAt;
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      if (sortBy === 'title') return a.name.localeCompare(b.name);
      return 0;
    });

  const handleCreateNew = () => {
    const newProj = createNewBlankCircuit();
    reloadProjects();
    onOpenProject(newProj);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned = duplicateStoredProject(id);
    if (cloned) {
      reloadProjects();
    }
  };

  const confirmDelete = () => {
    if (deletingProjectId) {
      deleteStoredProject(deletingProjectId);
      setDeletingProjectId(null);
      reloadProjects();
    }
  };

  const startRenaming = (project: StoredProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingTitle(project.name);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim()) {
      renameStoredProject(id, editingTitle.trim());
      reloadProjects();
    }
    setEditingProjectId(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const validation = validateProjectDocument(raw);
        if (!validation.valid) {
          alert(`Invalid MagicSmoke project:\n${validation.errors.join('\n')}`);
          return;
        }
        const imported = saveStoredProject(raw);
        reloadProjects();
        onOpenProject(imported);
      } catch (err) {
        alert('Could not parse JSON project file.');
      }
    };
    reader.readAsText(file);
  };

  const formatRelativeTime = (timestamp: number) => {
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 60) return 'Just now';
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleLaunchLineFollower = (project?: StoredProject) => {
    const lfProject =
      project ||
      projects.find(
        (p) =>
          p.id === 'starter_line_follower_robot' ||
          p.id === 'starter_line_follower' ||
          p.name.includes('Line Follower')
      );
    if (onLaunchLineFollowerLab) {
      onLaunchLineFollowerLab(lfProject);
    } else if (lfProject) {
      onOpenProject(lfProject);
    }
  };

  const handleLaunchRobotArm = (project?: StoredProject) => {
    const armProject =
      project ||
      projects.find(
        (p) =>
          p.id === 'starter_servo_robot_arm' ||
          Boolean(p.document?.robotArm) ||
          p.name.includes('Robot Arm')
      );
    if (onLaunchRobotArmLab) {
      onLaunchRobotArmLab(armProject);
    } else if (armProject) {
      onOpenProject(armProject);
    }
  };

  return (
    <div className="dashboard-shell relative flex flex-col w-screen h-screen font-sans overflow-hidden select-none bg-[#07081e] text-[#d5d4fc]">
      {/* 1. Atmospheric Digital Noise & CRT Scanline Background matching Image 2 */}
      <AtmosphericBackground />

      {/* 2. Top Control Console Navbar */}
      <DashboardTopNavbar
        onNavigateHome={() => {
          setFilterTab('all');
          setSearchQuery('');
        }}
        onCreateNewCircuit={handleCreateNew}
        onLaunchLineFollowerLab={() => handleLaunchLineFollower()}
        onLaunchRobotArmLab={() => handleLaunchRobotArm()}
        onImportJSON={handleImportFile}
        hasActiveSession={hasActiveSession}
        onReturnToEditor={onReturnToEditor}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectCategory={(cat) => setFilterTab(cat)}
      />

      {/* 3. Main Workspace: Vertical Navigation Rail + Center Stage */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Left Sidebar Rail */}
        <DashboardSidebar
          activeTab={filterTab}
          onTabChange={(tab) => {
            if (tab === 'lab') {
              handleLaunchLineFollower();
            } else if (tab === 'arm') {
              handleLaunchRobotArm();
            } else {
              setFilterTab(tab);
            }
          }}
          counts={{
            all: projects.length,
            custom: customCount,
            starters: starterCount,
          }}
        />

        {/* Scrollable Center Content Area with Electric-Yellow Scrollbar */}
        <main
          className="flex-1 overflow-y-auto w-full"
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 'none',
            overflowY: 'auto',
          }}
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {!searchQuery.trim() && (
            <>
              {/* Featured System 04 Hero Banner */}
              <DashboardHeroBanner
                onLaunchLineFollowerLab={() => handleLaunchLineFollower()}
                onCreateNewCircuit={handleCreateNew}
                onViewSchematic={() => {
                  const lfProject = projects.find(
                    (p) =>
                      p.id === 'starter_line_follower_robot' ||
                      p.id === 'starter_line_follower' ||
                      p.name.includes('Line Follower')
                  );
                  if (lfProject) onOpenProject(lfProject);
                }}
              />

              {/* What's New in MagicSmoke Signal Log Carousel */}
              <DashboardWhatsNewCarousel
                onLaunchLineFollowerLab={() => handleLaunchLineFollower()}
                onLaunchRobotArmLab={() => handleLaunchRobotArm()}
              />

              {/* Recent Designs Workspace Archive Carousel */}
              <DashboardRecentCarousel
                projects={projects}
                onOpenProject={onOpenProject}
                onLaunchLineFollowerLab={onLaunchLineFollowerLab}
                onLaunchRobotArmLab={handleLaunchRobotArm}
                onCreateNewCircuit={handleCreateNew}
              />
            </>
          )}

          {/* Circuit Projects Section Header & Controls */}
          <section className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#FFEA00]/30">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-black tracking-tight text-[#FFEA00] font-mono flex items-center gap-2">
                    <Terminal size={18} className="text-[#FFEA00]" />
                    <span>Circuit Projects</span>
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-[#090428] bg-[#FFEA00] px-2.5 py-0.5 border border-[#FFEA00]">
                    {projects.length} Total
                  </span>
                </div>
                <p className="text-xs font-mono text-[#FFF36D]/80">
                  Interactive schematic capture, component wiring, firmware editor, and physical robotics simulation.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
                <div className="px-3 py-1.5 bg-[#110849] border border-[#FFEA00]/40 flex items-center gap-2">
                  <span className="text-[10px] text-[#FFF36D]/70 uppercase">Parts</span>
                  <span className="text-[#00f0ff] font-bold">{totalParts}</span>
                </div>
                <div className="px-3 py-1.5 bg-[#110849] border border-[#FFEA00]/40 flex items-center gap-2">
                  <span className="text-[10px] text-[#FFF36D]/70 uppercase">Wires</span>
                  <span className="text-[#FFEA00] font-bold">{totalWires}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Filter Tabs & Sort Controls Toolbar */}
          <section className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Filter Tabs matching Image 2 */}
              <div className="flex items-center bg-[#110849] p-1 border border-[#FFEA00]/40 text-xs font-mono">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3.5 py-1.5 transition-all cursor-pointer font-bold ${
                    filterTab === 'all'
                      ? 'bg-[#FFEA00] text-[#090428] shadow-sm'
                      : 'text-[#FFF36D]/80 hover:text-[#FFEA00]'
                  }`}
                  data-testid="filter-tab-all"
                >
                  All ({projects.length})
                </button>
                <button
                  onClick={() => setFilterTab('custom')}
                  className={`px-3.5 py-1.5 transition-all cursor-pointer font-bold ${
                    filterTab === 'custom'
                      ? 'bg-[#FFEA00] text-[#090428] shadow-sm'
                      : 'text-[#FFF36D]/80 hover:text-[#FFEA00]'
                  }`}
                  data-testid="filter-tab-custom"
                >
                  My Designs ({customCount})
                </button>
                <button
                  onClick={() => setFilterTab('starters')}
                  className={`px-3.5 py-1.5 transition-all cursor-pointer font-bold ${
                    filterTab === 'starters'
                      ? 'bg-[#FFEA00] text-[#090428] shadow-sm'
                      : 'text-[#FFF36D]/80 hover:text-[#FFEA00]'
                  }`}
                  data-testid="filter-tab-starters"
                >
                  Starters ({starterCount})
                </button>
              </div>

              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#110849] px-3 py-1.5 border border-[#FFEA00]/40 text-xs font-mono text-[#FFF36D]/80">
                  <SlidersHorizontal size={13} className="text-[#FFEA00]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs text-[#FFF36D] outline-none cursor-pointer font-mono"
                    data-testid="dashboard-sort-select"
                  >
                    <option value="modified" className="bg-[#110849] text-[#FFF36D]">Recently Modified</option>
                    <option value="title" className="bg-[#110849] text-[#FFF36D]">Title (A-Z)</option>
                    <option value="created" className="bg-[#110849] text-[#FFF36D]">Date Created</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Project Cards Grid */}
          <section className="pb-16">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 px-6 border-2 border-dashed border-[#FFEA00]/30 bg-[#110849] max-w-lg mx-auto my-6">
                <div className="w-12 h-12 bg-[#090428] border border-[#FFEA00] flex items-center justify-center mx-auto mb-3 text-[#FFEA00]">
                  <Layers size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1 font-mono">
                  {searchQuery ? 'No matching circuits found' : 'No projects in this category'}
                </h3>
                <p className="text-xs text-[#FFF36D]/80 max-w-sm mx-auto mb-5 leading-relaxed font-mono">
                  {searchQuery
                    ? `No circuit titles match "${searchQuery}". Try a different keyword.`
                    : 'Start a new circuit from scratch or launch one of our verified starter robotics templates.'}
                </p>
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-[#090428] hover:bg-[#1A1054] text-xs font-mono font-bold text-[#FFEA00] border border-[#FFEA00] transition-colors cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                ) : (
                  <button
                    onClick={handleCreateNew}
                    className="px-5 py-2.5 bg-[#FFEA00] hover:bg-[#FFE000] text-[#090428] font-mono font-black text-xs shadow-btn-yellow transition-all cursor-pointer"
                  >
                    + Create First Circuit
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                  const isEditing = editingProjectId === project.id;
                  const compCount = project.document.components.length;
                  const wireCount = project.document.wires.length;
                  const isLineFollower =
                    project.id === 'starter_line_follower_robot' ||
                    project.id === 'starter_line_follower' ||
                    project.name.includes('Line Follower');
                  const isRobotArm =
                    project.id === 'starter_servo_robot_arm' ||
                    Boolean(project.document?.robotArm) ||
                    project.name.toLowerCase().includes('robot arm');

                  return (
                    <div
                      key={project.id}
                      onClick={() => !isEditing && onOpenProject(project)}
                      className="dashboard-project-card group bg-[#110849] hover:bg-[#160c5a] border border-[#FFEA00]/30 hover:border-[#FFEA00] transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-[4px_4px_0px_#FFEA00] relative hover:-translate-y-1"
                      data-testid={`project-card-${project.id}`}
                    >
                      {/* Circuit Thumbnail SVG Header */}
                      <div className="h-44 bg-[#0D063A] border-b border-[#FFEA00]/30 relative overflow-hidden flex items-center justify-center group-hover:brightness-105 transition-all">
                        <CircuitThumbnail
                          components={project.document.components}
                          wires={project.document.wires}
                          className="w-full h-full transform transition-transform duration-300 group-hover:scale-[1.03]"
                        />

                        {/* Category Badge */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                          {project.isStarter ? (
                            <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 bg-[#FFEA00] text-[#090428]">
                              <Sparkles size={9} strokeWidth={2.5} /> STARTER LAB
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 bg-[#00f0ff] text-[#090428]">
                              <Cpu size={9} /> CUSTOM DESIGN
                            </span>
                          )}
                        </div>

                        {/* Part & Wire Counters Overlay */}
                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-[9px] font-mono z-10">
                          <span className="bg-[#090428]/90 px-2 py-0.5 border border-[#FFEA00]/30 text-[#FFF36D]/80">
                            <span className="text-[#00f0ff] font-bold">{compCount}</span> {compCount === 1 ? 'part' : 'parts'}
                          </span>
                          <span className="bg-[#090428]/90 px-2 py-0.5 border border-[#FFEA00]/30 text-[#FFF36D]/80">
                            <span className="text-[#FFEA00] font-bold">{wireCount}</span> {wireCount === 1 ? 'wire' : 'wires'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body & Title */}
                      <div className="project-card-body p-4 sm:p-5 flex-1 flex flex-col justify-between bg-[#110849]">
                        <div>
                          {isEditing ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 mb-2"
                            >
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename(project.id);
                                  if (e.key === 'Escape') setEditingProjectId(null);
                                }}
                                autoFocus
                                className="w-full bg-[#07081e] border border-[#fff000] px-2 py-1 text-xs font-mono font-bold text-[#fff000] outline-none"
                              />
                              <button
                                onClick={() => saveRename(project.id)}
                                className="p-1.5 bg-[#fff000] text-[#07081e] hover:bg-[#ffe600] cursor-pointer"
                              >
                                <Check size={13} strokeWidth={3} />
                              </button>
                              <button
                                onClick={() => setEditingProjectId(null)}
                                className="p-1.5 bg-[#07081e] text-[#8b8ac4] hover:text-white border border-[#212354] cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h4 className="text-xs font-mono font-bold text-white group-hover:text-[#FFEA00] transition-colors leading-snug line-clamp-1">
                                {project.name}
                              </h4>
                              <button
                                onClick={(e) => startRenaming(project, e)}
                                className="opacity-0 group-hover:opacity-100 text-[#FFF36D]/70 hover:text-[#FFEA00] p-1 transition-opacity cursor-pointer"
                                title="Rename project"
                                data-testid={`rename-btn-${project.id}`}
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}

                          <p className="text-[11px] font-mono text-[#FFF36D]/75 line-clamp-2 leading-relaxed mb-4">
                            {project.description || 'Custom interactive circuit and firmware simulation.'}
                          </p>
                        </div>

                        {/* Card Footer: Metadata & Actions */}
                        <div className="pt-3 border-t border-[#FFEA00]/30 flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1 text-[10px] text-[#FFF36D]/70">
                            <Clock size={11} />
                            <span>{formatRelativeTime(project.updatedAt)}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleDuplicate(project.id, e)}
                              className="p-1 text-[#FFF36D]/70 hover:text-[#FFEA00] hover:bg-[#1A1054] transition-colors cursor-pointer"
                              title="Duplicate circuit project"
                              data-testid={`duplicate-project-btn-${project.id}`}
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingProjectId(project.id);
                              }}
                              className="p-1 text-[#FFF36D]/70 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete circuit project"
                              data-testid={`delete-project-btn-${project.id}`}
                            >
                              <Trash2 size={13} />
                            </button>

                            {isLineFollower && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchLineFollower(project);
                                }}
                                className="px-2 py-0.5 text-[10px] text-[#00f0ff] bg-[#00f0ff]/15 hover:bg-[#00f0ff] hover:text-[#090428] border border-[#00f0ff]/40 transition-all font-bold flex items-center gap-1 cursor-pointer ml-1"
                                title="Launch dedicated Line Follower Lab"
                                data-testid={`launch-lab-card-btn-${project.id}`}
                              >
                                <Play size={9} fill="currentColor" strokeWidth={0} />
                                <span>Lab</span>
                              </button>
                            )}

                            {isRobotArm && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchRobotArm(project);
                                }}
                                className="px-2 py-0.5 text-[10px] text-[#FFEA00] bg-[#FFEA00]/15 hover:bg-[#FFEA00] hover:text-[#090428] border border-[#FFEA00]/40 transition-all font-bold flex items-center gap-1 cursor-pointer ml-1"
                                title="Launch dedicated 5-Axis Servo Robot Arm Lab"
                                data-testid={`launch-arm-card-btn-${project.id}`}
                              >
                                <Play size={9} fill="currentColor" strokeWidth={0} />
                                <span>Arm</span>
                              </button>
                            )}

                            <button
                              onClick={() => onOpenProject(project)}
                              className="ml-1 flex items-center gap-1 px-2.5 py-1 bg-[#FFEA00] hover:bg-[#FFE000] text-[#090428] font-mono font-bold text-[11px] transition-all cursor-pointer"
                              data-testid={`open-project-btn-${project.id}`}
                            >
                              <span>Open</span>
                              <ArrowRight size={11} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-[#07081e]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d30] border-2 border-[#fff000] max-w-sm w-full p-6 shadow-hard-yellow space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 bg-rose-950/40 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-sm text-white font-mono">Delete Circuit Project</h3>
            </div>

            <p className="text-xs text-[#8b8ac4] leading-relaxed font-mono">
              Are you sure you want to delete this project? This will remove its circuit layout, sketch code, and configuration from local storage.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#212354] text-xs font-mono">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-3.5 py-1.5 bg-[#07081e] hover:bg-[#151745] text-[#8b8ac4] hover:text-white border border-[#212354] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer"
                data-testid="confirm-delete-btn"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
