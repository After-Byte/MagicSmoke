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
  setActiveProjectId,
} from '../project/projectStorage';
import { ProjectDocument, validateProjectDocument } from '../project/types';
import { CircuitThumbnail } from './CircuitThumbnail';
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
  Upload,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  FolderOpen,
  Activity,
  Zap,
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

  // Rename modal / inline state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Delete confirmation modal
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const reloadProjects = () => {
    const list = getAllStoredProjects();
    setProjects(list);
  };

  useEffect(() => {
    reloadProjects();
  }, []);

  // Compute aggregate statistics
  const totalParts = projects.reduce((acc, p) => acc + p.document.components.length, 0);
  const totalWires = projects.reduce((acc, p) => acc + p.document.wires.length, 0);
  const activeProjectId = getActiveProjectId();
  const activeProject = projects.find((p) => p.id === activeProjectId);

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

  return (
    <div className="flex flex-col w-screen h-screen bg-[#07090e] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* Top Brand & Navigation Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#0a0e17] border-b border-[#162030] z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.15)]">
              <Cpu className="text-[#00f0ff]" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#00f0ff] font-extrabold tracking-wider text-sm font-mono block leading-none">
                  MAGICSMOKE
                </span>
                <span className="text-[10px] font-mono text-[#38bdf8] bg-[#38bdf8]/10 px-1.5 py-0.2 rounded border border-[#38bdf8]/20">
                  v1.21
                </span>
              </div>
              <span className="text-[10px] text-[#64748b] font-mono leading-none mt-0.5 block">
                Robotics & Circuits IDE
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#1e2a3c] mx-2 hidden sm:block" />

          {/* Active Workspaces / Tab Indicator */}
          <nav className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-md bg-[#00f0ff]/15 text-[#00f0ff] font-semibold border border-[#00f0ff]/40 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
              Circuits
            </span>
          </nav>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-3">
          {hasActiveSession && onReturnToEditor && (
            <button
              onClick={onReturnToEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111928] hover:bg-[#1a2538] text-[#38bdf8] border border-[#23354f] text-xs font-mono transition-all shadow-sm"
              title="Resume current active simulation session"
              data-testid="resume-editor-btn"
            >
              <FolderOpen size={13} />
              <span>Resume Active Circuit</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f1420] hover:bg-[#161f30] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1d273a] text-xs font-mono cursor-pointer transition-colors shadow-sm">
            <Upload size={13} />
            <span className="hidden sm:inline">Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00f0ff] hover:bg-[#38bdf8] text-[#05080f] font-bold text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all active:scale-95"
            data-testid="new-circuit-btn"
          >
            <Plus size={14} />
            <span>New Circuit</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 max-w-7xl mx-auto w-full">
        {/* Page Introduction & Active Workspace Spotlight */}
        <section className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#141b27]">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-2xl font-bold text-[#f8fafc] tracking-tight">
                  Circuit Projects
                </h1>
                <span className="text-xs font-mono font-medium text-[#64748b] bg-[#0e1422] px-2.5 py-0.5 rounded-full border border-[#1b2638]">
                  {projects.length} Total
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Design, wire, and simulate robotics electronics with hardware ESP32 firmware, TB6612FNG drivers, and real-time physical kinematics.
              </p>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b101a] border border-[#192436] text-xs font-mono shadow-sm">
                <div className="w-6 h-6 rounded-md bg-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff]">
                  <Cpu size={13} />
                </div>
                <div>
                  <div className="text-[10px] text-[#64748b] uppercase tracking-wider">Placed Parts</div>
                  <div className="text-[#38bdf8] font-bold">{totalParts}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b101a] border border-[#192436] text-xs font-mono shadow-sm">
                <div className="w-6 h-6 rounded-md bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
                  <Zap size={13} />
                </div>
                <div>
                  <div className="text-[10px] text-[#64748b] uppercase tracking-wider">Active Wires</div>
                  <div className="text-[#10b981] font-bold">{totalWires}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b101a] border border-[#192436] text-xs font-mono shadow-sm">
                <div className="w-6 h-6 rounded-md bg-amber-400/10 flex items-center justify-center text-amber-400">
                  <Activity size={13} />
                </div>
                <div>
                  <div className="text-[10px] text-[#64748b] uppercase tracking-wider">Simulation</div>
                  <div className="text-amber-400 font-bold">Ready</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Line Follower Robotics Lab Spotlight */}
        <section className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[#071322] via-[#09182b] to-[#071220] border border-[#00f0ff]/30 shadow-[0_0_30px_rgba(0,240,255,0.08)] relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#00f0ff]/10 to-transparent pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#00f0ff] bg-[#00f0ff]/15 px-2.5 py-0.5 rounded-full border border-[#00f0ff]/30 uppercase tracking-wider">
                  <Sparkles size={11} /> Featured Simulation Lab
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/50">
                  Closed-Loop Feedback Verified
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#f8fafc] tracking-tight">
                Autonomous Line Follower Robotics Lab
              </h2>
              <p className="text-xs text-[#94a3b8] leading-relaxed font-mono">
                Complete hardware simulation: Arduino Uno R3 running C++ PID firmware, 8-channel optical reflectance sensor array, TB6612FNG dual motor driver, and unicycle differential drive kinematics inside an interactive 3D arena.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  const lfProject = projects.find((p) => p.id === 'starter_line_follower' || p.name.includes('Line Follower'));
                  if (onLaunchLineFollowerLab) {
                    onLaunchLineFollowerLab(lfProject);
                  } else if (lfProject) {
                    onOpenProject(lfProject);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00f0ff] hover:bg-[#38bdf8] text-[#05080f] font-bold text-xs font-mono shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all active:scale-95"
                data-testid="launch-line-follower-lab-btn"
              >
                <Play size={14} />
                <span>Launch Line Follower Lab</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => {
                  const lfProject = projects.find((p) => p.id === 'starter_line_follower' || p.name.includes('Line Follower'));
                  if (lfProject) onOpenProject(lfProject);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0f1726] hover:bg-[#162338] text-[#cbd5e1] border border-[#213550] text-xs font-mono transition-colors"
                title="Open schematic and wiring directly in Circuit Editor"
                data-testid="view-schematic-btn"
              >
                <Layers size={13} />
                <span>View Schematic</span>
              </button>
            </div>
          </div>
        </section>

        {/* Filter Toolbar & Search Controls */}
        <section className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center bg-[#0a0e17] p-1 rounded-xl border border-[#1a2536] text-xs font-mono shadow-sm">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterTab === 'all'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
                data-testid="filter-tab-all"
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => setFilterTab('custom')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterTab === 'custom'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
                data-testid="filter-tab-custom"
              >
                My Designs ({projects.filter((p) => !p.isStarter).length})
              </button>
              <button
                onClick={() => setFilterTab('starters')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterTab === 'starters'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
                data-testid="filter-tab-starters"
              >
                Starters ({projects.filter((p) => p.isStarter).length})
              </button>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search circuits..."
                  className="w-full bg-[#0a0e17] border border-[#1a2536] focus:border-[#00f0ff]/60 rounded-xl pl-9 pr-8 py-1.5 text-xs font-mono text-[#f8fafc] placeholder-[#64748b] outline-none transition-all shadow-sm"
                  data-testid="dashboard-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#e2e8f0]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#0a0e17] px-3 py-1.5 rounded-xl border border-[#1a2536] text-xs font-mono text-[#94a3b8] shadow-sm">
                <SlidersHorizontal size={13} className="text-[#64748b]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-mono text-[#cbd5e1] outline-none cursor-pointer"
                  data-testid="dashboard-sort-select"
                >
                  <option value="modified" className="bg-[#0a0e17]">Recently Modified</option>
                  <option value="title" className="bg-[#0a0e17]">Title (A-Z)</option>
                  <option value="created" className="bg-[#0a0e17]">Date Created</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Project Cards Grid */}
        <section className="pb-12">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-2xl border border-dashed border-[#1e2a3c] bg-[#090d15] max-w-lg mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#121824] border border-[#1f2b3e] flex items-center justify-center mx-auto mb-4 text-[#00f0ff] shadow-inner">
                <Layers size={26} />
              </div>
              <h3 className="text-sm font-bold text-[#f1f5f9] mb-1 font-mono">
                {searchQuery ? 'No matching circuits found' : 'No projects in this category'}
              </h3>
              <p className="text-xs text-[#64748b] max-w-sm mx-auto mb-5 font-mono leading-relaxed">
                {searchQuery
                  ? `No circuit titles or descriptions match "${searchQuery}". Try a different keyword.`
                  : 'Start a new circuit from scratch or launch one of our verified starter robotics templates.'}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-lg bg-[#141d2c] hover:bg-[#1d2a3f] text-xs font-mono text-[#38bdf8] border border-[#24344d] transition-colors"
                >
                  Clear Search Filter
                </button>
              ) : (
                <button
                  onClick={handleCreateNew}
                  className="px-5 py-2.5 rounded-lg bg-[#00f0ff] hover:bg-[#38bdf8] text-[#05080f] font-bold text-xs font-mono shadow-lg transition-all active:scale-95"
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

                return (
                  <div
                    key={project.id}
                    onClick={() => !isEditing && onOpenProject(project)}
                    className="group bg-[#0a0e16] hover:bg-[#0e1420] rounded-2xl border border-[#162030] hover:border-[#00f0ff]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative hover:-translate-y-0.5"
                    data-testid={`project-card-${project.id}`}
                  >
                    {/* Realistic Circuit Thumbnail Header */}
                    <div className="h-44 bg-[#060910] border-b border-[#141b26] relative overflow-hidden flex items-center justify-center group-hover:brightness-105 transition-all">
                      {/* Live Scaled Circuit SVG Preview */}
                      <CircuitThumbnail
                        components={project.document.components}
                        wires={project.document.wires}
                        className="w-full h-full transform transition-transform duration-500 group-hover:scale-[1.02]"
                      />

                      {/* Top Category Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                        {project.isStarter ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm">
                            <Sparkles size={10} /> Starter Lab
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 backdrop-blur-md shadow-sm">
                            <Cpu size={10} /> Custom Design
                          </span>
                        )}
                      </div>

                      {/* Bottom Overlay Counters */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-mono z-10">
                        <span className="bg-[#080d16]/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#1f2c40] text-[#94a3b8] font-semibold">
                          <span className="text-[#38bdf8] font-bold">{compCount}</span> {compCount === 1 ? 'part' : 'parts'}
                        </span>
                        <span className="bg-[#080d16]/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#1f2c40] text-[#94a3b8] font-semibold">
                          <span className="text-[#10b981] font-bold">{wireCount}</span> {wireCount === 1 ? 'wire' : 'wires'}
                        </span>
                      </div>
                    </div>

                    {/* Card Body & Description */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title & Rename Editor */}
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
                              className="w-full bg-[#05080f] border border-[#00f0ff] rounded-lg px-2.5 py-1 text-xs font-mono text-[#f8fafc] outline-none"
                            />
                            <button
                              onClick={() => saveRename(project.id)}
                              className="p-1.5 rounded-lg bg-[#00f0ff] text-[#05080f] hover:bg-[#38bdf8]"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingProjectId(null)}
                              className="p-1.5 rounded-lg bg-[#1a2436] text-[#94a3b8]"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="text-sm font-bold text-[#f8fafc] group-hover:text-[#00f0ff] transition-colors leading-snug line-clamp-1">
                              {project.name}
                            </h3>
                            <button
                              onClick={(e) => startRenaming(project, e)}
                              className="opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-[#cbd5e1] p-1 transition-opacity"
                              title="Rename project"
                              data-testid={`rename-btn-${project.id}`}
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}

                        <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed mb-4">
                          {project.description || 'Custom interactive circuit and firmware simulation.'}
                        </p>
                      </div>

                      {/* Card Footer: Metadata & Actions */}
                      <div className="pt-3.5 border-t border-[#141b27] flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                          <Clock size={11} />
                          <span>{formatRelativeTime(project.updatedAt)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDuplicate(project.id, e)}
                            className="p-1.5 text-[#64748b] hover:text-[#38bdf8] hover:bg-[#131b29] rounded-lg transition-colors"
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
                            className="p-1.5 text-[#64748b] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Delete circuit project"
                            data-testid={`delete-project-btn-${project.id}`}
                          >
                            <Trash2 size={13} />
                          </button>

                          {(project.id === 'starter_line_follower' || project.name.includes('Line Follower')) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onLaunchLineFollowerLab) {
                                  onLaunchLineFollowerLab(project);
                                } else {
                                  onOpenProject(project);
                                }
                              }}
                              className="px-2.5 py-1.5 text-xs text-[#05080f] bg-[#00f0ff] hover:bg-[#38bdf8] rounded-lg transition-all font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.2)] active:scale-95"
                              title="Launch dedicated Line Follower Lab"
                              data-testid={`launch-lab-card-btn-${project.id}`}
                            >
                              <Play size={11} />
                              <span>Lab</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenProject(project)}
                            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f0ff]/10 hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#05080f] font-bold text-xs border border-[#00f0ff]/30 hover:border-transparent transition-all shadow-sm"
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

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c111a] border border-[#223147] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-sm text-[#f8fafc] font-mono">Delete Circuit Project</h3>
            </div>

            <p className="text-xs text-[#94a3b8] leading-relaxed font-mono">
              Are you sure you want to delete this project? This will remove its circuit layout, sketch code, and configuration from local storage.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1a2536] font-mono text-xs">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#141b26] hover:bg-[#1d2738] text-[#cbd5e1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-sm"
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
