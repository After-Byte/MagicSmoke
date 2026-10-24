import React, { useState, useEffect } from 'react';
import {
  StoredProject,
  getAllStoredProjects,
  saveStoredProject,
  duplicateStoredProject,
  deleteStoredProject,
  renameStoredProject,
  createNewBlankCircuit,
  getActiveProjectId,
} from '../project/projectStorage';
import { validateProjectDocument } from '../project/types';
import { CircuitThumbnail } from './CircuitThumbnail';
import { DashboardTopNavbar } from './DashboardTopNavbar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeroBanner } from './DashboardHeroBanner';
import { DashboardWhatsNewCarousel } from './DashboardWhatsNewCarousel';
import { DashboardRecentCarousel } from './DashboardRecentCarousel';
import {
  Cpu,
  Plus,
  Search,
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
} from 'lucide-react';

interface DashboardProps {
  onOpenProject: (project: StoredProject) => void;
  hasActiveSession?: boolean;
  onReturnToEditor?: () => void;
  onLaunchLineFollowerLab?: (project?: StoredProject) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenProject,
  hasActiveSession,
  onReturnToEditor,
  onLaunchLineFollowerLab,
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

  return (
    <div className="dashboard-shell flex flex-col w-screen h-screen font-sans overflow-hidden select-none">
      {/* Refined Global Top Navbar */}
      <DashboardTopNavbar
        onNavigateHome={() => {
          setFilterTab('all');
          setSearchQuery('');
        }}
        onCreateNewCircuit={handleCreateNew}
        onLaunchLineFollowerLab={() => handleLaunchLineFollower()}
        onImportJSON={handleImportFile}
        hasActiveSession={hasActiveSession}
        onReturnToEditor={onReturnToEditor}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectCategory={(cat) => setFilterTab(cat)}
      />

      {/* Main Workspace Layout: Collapsible Sidebar + Scrollable Center Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <DashboardSidebar
          activeTab={filterTab}
          onTabChange={(tab) => {
            if (tab === 'lab') {
              handleLaunchLineFollower();
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

        {/* Scrollable Center Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-[1440px] mx-auto w-full">
          {!searchQuery.trim() && (
            <>
              {/* Engineering Spotlight / Hero Banner */}
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

              {/* What's New Carousel */}
              <DashboardWhatsNewCarousel
                onLaunchLineFollowerLab={() => handleLaunchLineFollower()}
              />

              {/* Recent Designs Carousel (Live Data from projectStorage) */}
              <DashboardRecentCarousel
                projects={projects}
                onOpenProject={onOpenProject}
                onLaunchLineFollowerLab={onLaunchLineFollowerLab}
                onCreateNewCircuit={handleCreateNew}
              />
            </>
          )}

          {/* All Projects Section Header & Controls */}
          <section className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="dashboard-section-title text-xl font-black tracking-tight">
                    Circuit Projects
                  </h3>
                  <span className="text-xs font-mono font-medium text-[#64748b] bg-[#f1f5f9] px-2.5 py-0.5 rounded-full border border-[#e2e8f0]">
                    {projects.length} Total
                  </span>
                </div>
                <p className="text-xs text-[#64748b]">
                  Interactive schematic capture, component wiring, firmware editor, and physical robotics simulation.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs flex items-center gap-2">
                  <span className="text-[10px] text-[#64748b] uppercase">Parts</span>
                  <span className="text-[#1677ff] font-bold">{totalParts}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs flex items-center gap-2">
                  <span className="text-[10px] text-[#64748b] uppercase">Wires</span>
                  <span className="text-emerald-600 font-bold">{totalWires}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Filter Tabs & Sort Controls Toolbar */}
          <section className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-[#e2e8f0] text-xs font-medium shadow-xs">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-[#1677ff] text-white font-bold shadow-xs'
                      : 'text-[#64748b] hover:text-[#172033]'
                  }`}
                  data-testid="filter-tab-all"
                >
                  All ({projects.length})
                </button>
                <button
                  onClick={() => setFilterTab('custom')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'custom'
                      ? 'bg-[#1677ff] text-white font-bold shadow-xs'
                      : 'text-[#64748b] hover:text-[#172033]'
                  }`}
                  data-testid="filter-tab-custom"
                >
                  My Designs ({customCount})
                </button>
                <button
                  onClick={() => setFilterTab('starters')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'starters'
                      ? 'bg-[#1677ff] text-white font-bold shadow-xs'
                      : 'text-[#64748b] hover:text-[#172033]'
                  }`}
                  data-testid="filter-tab-starters"
                >
                  Starters ({starterCount})
                </button>
              </div>

              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#e2e8f0] text-xs font-mono text-[#64748b] shadow-xs">
                  <SlidersHorizontal size={13} className="text-[#94a3b8]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs text-[#172033] outline-hidden cursor-pointer font-sans"
                    data-testid="dashboard-sort-select"
                  >
                    <option value="modified">Recently Modified</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="created">Date Created</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Project Cards Grid */}
          <section className="pb-16">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-[#cbd5e1] bg-white max-w-lg mx-auto my-6 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center mx-auto mb-3 text-[#1677ff]">
                  <Layers size={24} />
                </div>
                <h3 className="text-sm font-bold text-[#172033] mb-1">
                  {searchQuery ? 'No matching circuits found' : 'No projects in this category'}
                </h3>
                <p className="text-xs text-[#64748b] max-w-sm mx-auto mb-5 leading-relaxed">
                  {searchQuery
                    ? `No circuit titles match "${searchQuery}". Try a different keyword.`
                    : 'Start a new circuit from scratch or launch one of our verified starter robotics templates.'}
                </p>
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-semibold text-[#1677ff] border border-[#cbd5e1] transition-colors cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                ) : (
                  <button
                    onClick={handleCreateNew}
                    className="px-5 py-2.5 rounded-xl bg-[#1677ff] hover:bg-[#0060df] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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

                  return (
                    <div
                      key={project.id}
                      onClick={() => !isEditing && onOpenProject(project)}
                      className="dashboard-project-card group bg-white hover:bg-[#fcfdfd] rounded-2xl border border-[#e2e8f0] hover:border-[#1677ff]/50 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer shadow-xs hover:shadow-md relative hover:-translate-y-0.5"
                      data-testid={`project-card-${project.id}`}
                    >
                      {/* Circuit Thumbnail SVG Header */}
                      <div className="h-44 bg-[#0a0e17] border-b border-[#e2e8f0] relative overflow-hidden flex items-center justify-center group-hover:brightness-105 transition-all">
                        <CircuitThumbnail
                          components={project.document.components}
                          wires={project.document.wires}
                          className="w-full h-full transform transition-transform duration-300 group-hover:scale-[1.03]"
                        />

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                          {project.isStarter ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-sm shadow-xs">
                              <Sparkles size={10} /> Starter Lab
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#1677ff]/20 text-[#38bdf8] border border-[#1677ff]/30 backdrop-blur-sm shadow-xs">
                              <Cpu size={10} /> Custom Design
                            </span>
                          )}
                        </div>

                        {/* Part & Wire Counters Overlay */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-mono z-10">
                          <span className="bg-[#0f172a]/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#334155] text-[#94a3b8] font-semibold">
                            <span className="text-[#38bdf8] font-bold">{compCount}</span> {compCount === 1 ? 'part' : 'parts'}
                          </span>
                          <span className="bg-[#0f172a]/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#334155] text-[#94a3b8] font-semibold">
                            <span className="text-emerald-400 font-bold">{wireCount}</span> {wireCount === 1 ? 'wire' : 'wires'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body & Title */}
                      <div className="project-card-body p-4 sm:p-5 flex-1 flex flex-col justify-between">
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
                                className="w-full bg-[#f8fafc] border border-[#1677ff] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#172033] outline-hidden"
                              />
                              <button
                                onClick={() => saveRename(project.id)}
                                className="p-1.5 rounded-lg bg-[#1677ff] text-white hover:bg-[#0060df] cursor-pointer"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => setEditingProjectId(null)}
                                className="p-1.5 rounded-lg bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h4 className="text-sm font-bold text-[#172033] group-hover:text-[#1677ff] transition-colors leading-snug line-clamp-1">
                                {project.name}
                              </h4>
                              <button
                                onClick={(e) => startRenaming(project, e)}
                                className="opacity-0 group-hover:opacity-100 text-[#94a3b8] hover:text-[#172033] p-1 transition-opacity cursor-pointer"
                                title="Rename project"
                                data-testid={`rename-btn-${project.id}`}
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}

                          <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed mb-4">
                            {project.description || 'Custom interactive circuit and firmware simulation.'}
                          </p>
                        </div>

                        {/* Card Footer: Metadata & Actions */}
                        <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
                            <Clock size={11} />
                            <span>{formatRelativeTime(project.updatedAt)}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleDuplicate(project.id, e)}
                              className="p-1.5 text-[#94a3b8] hover:text-[#1677ff] hover:bg-[#f1f5f9] rounded-lg transition-colors cursor-pointer"
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
                              className="p-1.5 text-[#94a3b8] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                                className="px-2.5 py-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all font-bold flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ml-1"
                                title="Launch dedicated Line Follower Lab"
                                data-testid={`launch-lab-card-btn-${project.id}`}
                              >
                                <Play size={10} fill="currentColor" />
                                <span>Lab</span>
                              </button>
                            )}

                            <button
                              onClick={() => onOpenProject(project)}
                              className="ml-1 flex items-center gap-1 px-3 py-1 rounded-lg bg-[#1677ff]/10 hover:bg-[#1677ff] text-[#1677ff] hover:text-white font-bold text-xs border border-[#1677ff]/30 hover:border-transparent transition-all shadow-2xs cursor-pointer active:scale-95"
                              data-testid={`open-project-btn-${project.id}`}
                            >
                              <span>Open</span>
                              <ArrowRight size={12} />
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
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-sm text-[#172033]">Delete Circuit Project</h3>
            </div>

            <p className="text-xs text-[#64748b] leading-relaxed">
              Are you sure you want to delete this project? This will remove its circuit layout, sketch code, and configuration from local storage.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f1f5f9] text-xs">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#64748b] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
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
