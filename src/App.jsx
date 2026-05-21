import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  Terminal, 
  Copy, 
  Plus, 
  RefreshCw, 
  FolderOpen, 
  HelpCircle, 
  CheckCircle2,
  Sparkles,
  Zap,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Globe,
  AlertCircle,
  Info
} from 'lucide-react';
import './App.css';

// Import our commit suggester helper
import { generateCommitSuggestions } from './commitSuggester';

function App() {
  // --- Local Repo Path State ---
  const [repoPath, setRepoPath] = useState('c:\\Users\\901710\\Priv\\Tools');
  const [localRepoInfo, setLocalRepoInfo] = useState({
    isValid: false,
    activeBranch: '',
    branches: [],
    files: [],
    commits: [],
    error: null
  });
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [activeDiffFile, setActiveDiffFile] = useState(null);
  const [diffContent, setDiffContent] = useState('');
  const [showDiffModal, setShowDiffModal] = useState(false);

  // --- Common Active Commit States (Hover Tooltip) ---
  const [hoveredCommit, setHoveredCommit] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // --- SVG Tree Zoom / Pan ---
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef(null);

  // --- Sidebar & Form Tabs ---
  // 'ai' = AI Prompt Suggester, 'builder' = Conventional Builder, 'guide' = Quick Guide
  const [activeRightTab, setActiveRightTab] = useState('ai');
  
  // --- AI Suggester Input ---
  const [userPrompt, setUserPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  // --- Conventional Builder State ---
  const [builderType, setBuilderType] = useState('feat');
  const [builderScope, setBuilderScope] = useState('');
  const [builderSubject, setBuilderSubject] = useState('');
  const [builderBody, setBuilderBody] = useState('');
  const [builderBreaking, setBuilderBreaking] = useState(false);

  // --- Retro Terminal Console ---
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'output', text: '⚡ GitVortex Live Shell v2.0.0 (Monochrome Edition)' },
    { type: 'output', text: 'Watching your local repository directory.' },
    { type: 'output', text: 'Type "help" to list available git commands.' }
  ]);
  const terminalEndRef = useRef(null);

  // --- Branch Creation Form State ---
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);

  // --- Notification Toast ---
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // ----------------------------------------------------
  // EFFECT: Fetch Local Repo Info on mount/path change
  // ----------------------------------------------------
  useEffect(() => {
    fetchLocalRepoData();
    const interval = setInterval(() => {
      fetchLocalRepoData(true);
    }, 4000); // Poll every 4s for real-time local file updates
    return () => clearInterval(interval);
  }, [repoPath]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Show welcome toast
  useEffect(() => {
    showToast('Connected to Local Git Inspector.', 'success');
  }, []);

  const fetchLocalRepoData = async (silent = true) => {
    if (!silent) setLoadingLocal(true);
    try {
      const res = await fetch(`/api/git/info?repoPath=${encodeURIComponent(repoPath)}`);
      const data = await res.json();
      
      // Fallback object initialization to absolutely prevent undefined maps
      setLocalRepoInfo({
        isValid: data?.isValid ?? false,
        activeBranch: data?.activeBranch ?? '',
        branches: data?.branches ?? [],
        files: data?.files ?? [],
        commits: data?.commits ?? [],
        error: data?.error ?? null
      });

      if (!data?.isValid && !silent) {
        showToast(`Repo Error: ${data?.error || 'Invalid Directory'}`, 'error');
      }
    } catch (err) {
      setLocalRepoInfo({
        isValid: false,
        activeBranch: '',
        branches: [],
        files: [],
        commits: [],
        error: err.message
      });
    } finally {
      if (!silent) setLoadingLocal(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Helper to execute git command on local backend
  const runLocalCommand = async (action, params = {}) => {
    try {
      const res = await fetch('/api/git/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, action, params })
      });
      const data = await res.json();
      fetchLocalRepoData(true);
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ----------------------------------------------------
  // COMPUTED PROPERTIES (Safeguarded against undef arrays)
  // ----------------------------------------------------
  const currentGitTree = useMemo(() => {
    return localRepoInfo?.commits || [];
  }, [localRepoInfo]);

  const currentBranches = useMemo(() => {
    return localRepoInfo?.branches || [];
  }, [localRepoInfo]);

  const activeBranchName = useMemo(() => {
    return localRepoInfo?.activeBranch || 'main';
  }, [localRepoInfo]);

  // Separate local and remote branches
  const localBranchesList = useMemo(() => {
    return currentBranches.filter(b => !b.isRemote);
  }, [currentBranches]);

  const remoteBranchesList = useMemo(() => {
    return currentBranches.filter(b => b.isRemote);
  }, [currentBranches]);

  // ----------------------------------------------------
  // MONOCHROME COORDINATES GRAPH LAYOUT SOLVER
  // ----------------------------------------------------
  const graphLayout = useMemo(() => {
    const commits = currentGitTree;
    const branches = currentBranches;

    if (commits.length === 0) return { nodes: [], paths: [], height: 200 };

    // 1. Assign columns for branches
    const branchLanes = {};
    let laneCounter = 0;

    const allUniqueBranches = new Set();
    branches.forEach(b => allUniqueBranches.add(b.name));
    commits.forEach(c => {
      if (c.branches) {
        c.branches.forEach(b => allUniqueBranches.add(b));
      }
    });

    // Active branch gets Column 0 (center focus), then local branches, then remotes
    const sortedBranches = Array.from(allUniqueBranches).sort((a, b) => {
      const aObj = branches.find(br => br.name === a);
      const bObj = branches.find(br => br.name === b);
      if (a === activeBranchName) return -1;
      if (b === activeBranchName) return 1;
      if (aObj && !aObj.isRemote && (!bObj || bObj.isRemote)) return -1;
      if (bObj && !bObj.isRemote && (!aObj || aObj.isRemote)) return 1;
      return a.localeCompare(b);
    });

    sortedBranches.forEach(bName => {
      branchLanes[bName] = laneCounter++;
    });

    if (laneCounter === 0) laneCounter = 1;

    // Sizing offsets
    const startY = 80;
    const spacingY = 70;
    const spacingX = 75; // Wider for ultra-clean spacing
    const startX = 60;

    // 2. Map nodes
    const nodes = commits.map((commit, idx) => {
      let lane = 0;
      if (commit.branches && commit.branches.length > 0) {
        const matchingBranch = commit.branches.find(b => branchLanes[b] !== undefined);
        if (matchingBranch) lane = branchLanes[matchingBranch];
      } else {
        // Fallback trace to parent column
        lane = 0;
      }

      const x = startX + lane * spacingX;
      const y = startY + idx * spacingY;

      return {
        ...commit,
        x,
        y,
        lane
      };
    });

    // 3. Map parent path curves
    const paths = [];
    nodes.forEach(node => {
      if (node.parents) {
        node.parents.forEach((parentHash, pIdx) => {
          const shortParentHash = parentHash.substring(0, 8);
          const parentNode = nodes.find(n => n.hash === shortParentHash || n.fullHash?.startsWith(parentHash));
          
          if (parentNode) {
            const isMerge = pIdx > 0;
            paths.push({
              id: `${node.hash}-${parentNode.hash}`,
              fromX: parentNode.x,
              fromY: parentNode.y,
              toX: node.x,
              toY: node.y,
              isMerge,
              lane: parentNode.lane
            });
          }
        });
      }
    });

    const totalHeight = startY + commits.length * spacingY + 50;

    return {
      nodes,
      paths,
      height: Math.max(totalHeight, 400)
    };
  }, [currentGitTree, currentBranches, activeBranchName]);

  // ----------------------------------------------------
  // EVENT: Draggable SVG Tree Handlers
  // ----------------------------------------------------
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction) => {
    setZoom(prev => {
      const next = direction === 'in' ? prev + 0.15 : prev - 0.15;
      return Math.max(0.4, Math.min(2.0, next));
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ----------------------------------------------------
  // EFFECT: Live AI Commit Suggester
  // ----------------------------------------------------
  useEffect(() => {
    if (!userPrompt.trim()) {
      setAiSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      const suggestions = generateCommitSuggestions(userPrompt);
      setAiSuggestions(suggestions);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [userPrompt]);

  // Real changes analyzer
  const handleAnalyzeRealDiff = async () => {
    setLoadingLocal(true);
    try {
      const res = await fetch(`/api/git/diff?repoPath=${encodeURIComponent(repoPath)}`);
      const data = await res.json();
      if (data.isValid && data.diff) {
        const suggestions = generateCommitSuggestions('', data.diff);
        setAiSuggestions(suggestions);
        
        if (suggestions.length > 0) {
          const mainSug = suggestions[0];
          setUserPrompt(`${mainSug.type}(${mainSug.scope || 'core'}): ${mainSug.message.split(': ').pop()}`);
          showToast('Analyzed live changes and drafted suggested titles.', 'success');
        } else {
          showToast('No unstaged files detected to analyze.', 'info');
        }
      } else {
        showToast('No uncommitted changes detected.', 'info');
      }
    } catch (e) {
      showToast(`Error analyzing: ${e.message}`, 'error');
    } finally {
      setLoadingLocal(false);
    }
  };

  // Apply Git staging & Commit
  const handleApplyCommit = async (message) => {
    if (!message || message.trim() === '') {
      showToast('Commit message is empty', 'error');
      return;
    }

    setLoadingLocal(true);
    // 1. Stage all
    const addRes = await runLocalCommand('add', { file: '.' });
    if (!addRes.success) {
      showToast(`Add failed: ${addRes.error}`, 'error');
      setLoadingLocal(false);
      return;
    }

    // 2. Commit
    const commitRes = await runLocalCommand('commit', { message });
    if (commitRes.success) {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'command', text: `git commit -m "${message}"` },
        { type: 'output', text: commitRes.stdout || 'Committed successfully.' }
      ]);
      showToast('Successfully committed changes!', 'success');
      setUserPrompt('');
      fetchLocalRepoData(true);
    } else {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'command', text: `git commit -m "${message}"` },
        { type: 'error', text: commitRes.error || 'Commit execution failed.' }
      ]);
      showToast(`Commit failed: ${commitRes.error}`, 'error');
    }
    setLoadingLocal(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  // ----------------------------------------------------
  // step builder state calculation
  // ----------------------------------------------------
  const conventionalPreview = useMemo(() => {
    const scopeStr = builderScope.trim() ? `(${builderScope.trim().toLowerCase()})` : '';
    const breakStr = builderBreaking ? '!' : '';
    const subjectStr = builderSubject.trim().toLowerCase() || 'summary of changes';
    
    let message = `${builderType}${scopeStr}${breakStr}: ${subjectStr}`;
    if (builderBody.trim()) {
      message += `\n\n${builderBody.trim()}`;
    }
    return message;
  }, [builderType, builderScope, builderSubject, builderBody, builderBreaking]);

  // ----------------------------------------------------
  // BRANCH ACTIONS (Local Executions)
  // ----------------------------------------------------
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      showToast('Branch name cannot be empty', 'error');
      return;
    }

    const cleanName = newBranchName.trim().replace(/\s+/g, '-');
    setLoadingLocal(true);
    
    const res = await runLocalCommand('create-branch', { branch: cleanName });
    if (res.success) {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'command', text: `git checkout -b ${cleanName}` },
        { type: 'output', text: res.stdout || `Switched to a new branch '${cleanName}'` }
      ]);
      showToast(`Branch "${cleanName}" created and checked out!`, 'success');
    } else {
      showToast(`Failed to create branch: ${res.error}`, 'error');
    }
    
    setLoadingLocal(false);
    setNewBranchName('');
    setShowNewBranchModal(false);
  };

  const handleCheckoutBranch = async (branchName) => {
    setLoadingLocal(true);
    const res = await runLocalCommand('checkout', { branch: branchName });
    if (res.success) {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'command', text: `git checkout ${branchName}` },
        { type: 'output', text: res.stdout || `Switched to branch '${branchName}'` }
      ]);
      showToast(`Checked out branch "${branchName}"`, 'success');
    } else {
      showToast(`Checkout failed: ${res.error}`, 'error');
    }
    setLoadingLocal(false);
  };

  const handleQuickMerge = async (sourceBranch) => {
    setLoadingLocal(true);
    const res = await runLocalCommand('merge', { branch: sourceBranch });
    if (res.success) {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'command', text: `git merge ${sourceBranch}` },
        { type: 'output', text: res.stdout || 'Merge completed successfully.' }
      ]);
      showToast(`Merged "${sourceBranch}" successfully!`, 'success');
    } else {
      showToast(`Merge failed: ${res.error}`, 'error');
    }
    setLoadingLocal(false);
  };

  const handleQuickRebase = async (targetBranch) => {
    setLoadingLocal(true);
    const res = await runLocalCommand('rebase', { branch: targetBranch });
    if (res.success) {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'command', text: `git rebase ${targetBranch}` },
        { type: 'output', text: res.stdout || 'Rebase complete.' }
      ]);
      showToast(`Rebased successfully!`, 'success');
    } else {
      showToast(`Rebase failed: ${res.error}`, 'error');
    }
    setLoadingLocal(false);
  };

  const handleToggleStageFile = async (file) => {
    setLoadingLocal(true);
    const action = file.isStaged ? 'raw' : 'add';
    const params = file.isStaged 
      ? { command: `git reset HEAD "${file.path}"` }
      : { file: file.path };

    const res = await runLocalCommand(action, params);
    if (res.success) {
      showToast(file.isStaged ? `Unstaged ${file.path}` : `Staged ${file.path}`, 'success');
    } else {
      showToast(`Action failed: ${res.error}`, 'error');
    }
    setLoadingLocal(false);
  };

  const handleViewFileDiff = async (file) => {
    setLoadingLocal(true);
    try {
      const res = await fetch(`/api/git/diff?repoPath=${encodeURIComponent(repoPath)}&file=${encodeURIComponent(file.path)}&staged=${file.isStaged}`);
      const data = await res.json();
      if (data.isValid) {
        setDiffContent(data.diff);
        setActiveDiffFile(file);
        setShowDiffModal(true);
      }
    } catch (e) {
      showToast(`Failed to load diff: ${e.message}`, 'error');
    } finally {
      setLoadingLocal(false);
    }
  };

  // ----------------------------------------------------
  // TERMINAL INPUT INTERPRETER
  // ----------------------------------------------------
  const handleTerminalSubmit = async (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const fullCmd = terminalInput.trim();
    setTerminalLogs(prev => [...prev, { type: 'command', text: fullCmd }]);
    setTerminalInput('');

    const args = fullCmd.split(/\s+/);
    const baseCmd = args[0];

    if (baseCmd === 'clear') {
      setTerminalLogs([]);
      return;
    }

    if (baseCmd === 'help') {
      setTerminalLogs(prev => [
        ...prev,
        { type: 'output', text: '📚 Supported git shell actions:\n' +
          '  git status                      - Show local working directory changes\n' +
          '  git branch                      - List branches\n' +
          '  git branch <name>               - Create branch off active commit\n' +
          '  git checkout <name>             - Checkout selected branch or commit hash\n' +
          '  git checkout -b <name>          - Create and switch to a new branch\n' +
          '  git commit -m "<msg>"           - Stage and commit working directory changes\n' +
          '  git merge <branch>              - Merge branch changes into current HEAD\n' +
          '  git rebase <branch>             - Rebase active stream onto selected branch HEAD\n' +
          '  git log                         - Display commit line logs\n' +
          '  clear                           - Clear terminal lines' }
      ]);
      return;
    }

    if (baseCmd !== 'git') {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `shell: command not found: ${baseCmd}. Type "help" for developer tools manual.` }]);
      return;
    }

    const action = args[1];
    if (!action) {
      setTerminalLogs(prev => [...prev, { type: 'output', text: 'Usage: git <command> [options]' }]);
      return;
    }

    setLoadingLocal(true);
    let runAction = '';
    let params = {};

    if (action === 'status') {
      runAction = 'raw';
      params = { command: 'git status' };
    } else if (action === 'branch') {
      const name = args[2];
      if (!name) {
        runAction = 'raw';
        params = { command: 'git branch -a' };
      } else {
        runAction = 'create-branch';
        params = { branch: name };
      }
    } else if (action === 'checkout') {
      if (args[2] === '-b' && args[3]) {
        runAction = 'create-branch';
        params = { branch: args[3] };
      } else if (args[2]) {
        runAction = 'checkout';
        params = { branch: args[2] };
      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: 'Error: checkout target branch or hash parameter required.' }]);
        setLoadingLocal(false);
        return;
      }
    } else if (action === 'commit') {
      const mIdx = args.indexOf('-m');
      if (mIdx !== -1) {
        const fullMessageMatch = fullCmd.match(/-m\s+["'](.*?)["']/);
        const message = fullMessageMatch ? fullMessageMatch[1] : args[mIdx + 1];
        
        await runLocalCommand('add', { file: '.' });
        runAction = 'commit';
        params = { message };
      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: 'Error: Commit requires standard parameter format git commit -m "message"' }]);
        setLoadingLocal(false);
        return;
      }
    } else if (action === 'merge') {
      if (args[2]) {
        runAction = 'merge';
        params = { branch: args[2] };
      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: 'Error: Merge requires target branch parameter.' }]);
        setLoadingLocal(false);
        return;
      }
    } else if (action === 'rebase') {
      if (args[2]) {
        runAction = 'rebase';
        params = { branch: args[2] };
      } else {
        setTerminalLogs(prev => [...prev, { type: 'error', text: 'Error: Rebase requires target rebase parameter.' }]);
        setLoadingLocal(false);
        return;
      }
    } else if (action === 'log') {
      runAction = 'raw';
      params = { command: 'git log --oneline -n 12' };
    } else {
      runAction = 'raw';
      params = { command: fullCmd };
    }

    const res = await runLocalCommand(runAction, params);
    if (res.success) {
      setTerminalLogs(prev => [...prev, { type: 'output', text: res.stdout || 'Command completed successfully.' }]);
    } else {
      setTerminalLogs(prev => [...prev, { type: 'error', text: res.error || res.stderr || 'Execution failed.' }]);
    }
    setLoadingLocal(false);
  };

  return (
    <div className="app-container">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="top-header">
        <div className="brand-section">
          <div className="brand-logo">
            <GitBranch size={20} />
          </div>
          <div className="brand-title">
            <h1>GitVortex</h1>
            <div className="brand-subtitle">local workspace analyzer & AI commit helper</div>
          </div>
        </div>

        {/* Local Folder Repository Selector */}
        <div className="repo-selector-bar">
          <FolderOpen size={15} />
          <input 
            type="text" 
            className="repo-selector-input" 
            placeholder="Target Local Repository Path..."
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
          />
          <button className="canvas-btn" style={{ width: 24, height: 24 }} onClick={() => fetchLocalRepoData(false)}>
            <RefreshCw size={12} className={loadingLocal ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="mode-badge-mono">
          🔌 LOCAL INSPECTOR
        </div>
      </header>

      {/* 2. MAIN LAYOUT BODY */}
      <main className="main-dashboard">
        
        {/* SIDEBAR LEFT: Branch list, status, actions */}
        <aside className="sidebar-panel">
          
          {/* Section A: Local Branches */}
          <div className="panel-header">
            <div className="panel-title">
              <GitBranch size={14} />
              <span>Local Branches ({localBranchesList.length})</span>
            </div>
            <button className="canvas-btn" style={{ width: 26, height: 26 }} onClick={() => setShowNewBranchModal(true)}>
              <Plus size={13} />
            </button>
          </div>
          
          <div className="panel-content" style={{ maxHeight: '40%', overflowY: 'auto' }}>
            <div className="branch-list">
              {localBranchesList.map((br) => (
                <div 
                  key={br.name} 
                  className={`branch-item ${br.isActive ? 'active' : ''}`}
                  onClick={() => handleCheckoutBranch(br.name)}
                >
                  <div className="branch-info">
                    <GitBranch size={13} className="branch-icon" />
                    <span className="branch-name" title={br.name}>{br.name}</span>
                  </div>
                  {br.isActive && <span className="branch-badge-mono">active</span>}
                </div>
              ))}
              {localBranchesList.length === 0 && (
                <div className="empty-state-mono">No local branches.</div>
              )}
            </div>
          </div>

          {/* Section B: Remote Branches */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div className="panel-title">
              <Globe size={14} />
              <span>Remote Branches ({remoteBranchesList.length})</span>
            </div>
          </div>
          
          <div className="panel-content" style={{ maxHeight: '30%', overflowY: 'auto' }}>
            <div className="branch-list">
              {remoteBranchesList.map((br) => (
                <div 
                  key={br.name} 
                  className={`branch-item ${br.isActive ? 'active' : ''}`}
                  onClick={() => handleCheckoutBranch(br.name)}
                >
                  <div className="branch-info">
                    <Globe size={13} className="branch-icon" style={{ opacity: 0.5 }} />
                    <span className="branch-name" title={br.name}>{br.name}</span>
                  </div>
                  <span className="branch-badge-mono remote">remote</span>
                </div>
              ))}
              {remoteBranchesList.length === 0 && (
                <div className="empty-state-mono">No remote branches found.</div>
              )}
            </div>
          </div>

          {/* Section C: Uncommitted Files Status */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div className="panel-title">
              <GitPullRequest size={14} />
              <span>Modified Files ({localRepoInfo?.files?.length || 0})</span>
            </div>
            {(localRepoInfo?.files || []).length > 0 && (
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleAnalyzeRealDiff}
              >
                Analyze
              </button>
            )}
          </div>

          <div className="panel-content" style={{ overflowY: 'auto' }}>
            {(!localRepoInfo?.files || localRepoInfo.files.length === 0) ? (
              <div className="empty-state-mono">
                <CheckCircle2 size={18} />
                <p>Working tree clean.</p>
              </div>
            ) : (
              <div className="file-list">
                {(localRepoInfo.files || []).map(file => (
                  <div key={file.path} className="file-item">
                    <div className="file-details">
                      <input 
                        type="checkbox" 
                        className="checkbox-custom"
                        checked={file.isStaged}
                        onChange={() => handleToggleStageFile(file)}
                      />
                      <span 
                        className="file-path" 
                        title={file.path}
                        onClick={() => handleViewFileDiff(file)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {file.path.split('/').pop()}
                      </span>
                    </div>
                    <span className={`file-status-indicator ${file.type}`}>
                      {file.code.trim()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: SVG Branch Visualizer Canvas */}
        <section className="center-canvas">
          {/* Zoom/Pan Toolbar Controls */}
          <div className="canvas-toolbar">
            <button className="canvas-btn" title="Zoom In" onClick={() => handleZoom('in')}>
              <ZoomIn size={15} />
            </button>
            <button className="canvas-btn" title="Zoom Out" onClick={() => handleZoom('out')}>
              <ZoomOut size={15} />
            </button>
            <button className="canvas-btn" title="Reset Camera" onClick={handleResetZoom}>
              <Maximize2 size={15} />
            </button>
            <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="visualizer-title">
            <span className="visualizer-title-dot"></span>
            <span>Local Commits Graph</span>
          </div>

          {/* Draggable and interactive SVG graphic container */}
          <div 
            className="git-svg-container"
            ref={svgContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {currentGitTree.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', gap: 10 }}>
                <AlertCircle size={32} />
                <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>No commits found or invalid git folder.</p>
              </div>
            ) : (
              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <marker 
                    id="arrow-mono" 
                    viewBox="0 0 10 10" 
                    refX="6" 
                    refY="5" 
                    markerWidth="6" 
                    markerHeight="6" 
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 2 L 10 5 L 0 8 z" fill="#888" />
                  </marker>
                </defs>

                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  
                  {/* 1. Draw connecting bezier lines (monochrome) */}
                  {graphLayout.paths.map((path) => {
                    const dy = path.toY - path.fromY;
                    const curvePath = `M ${path.fromX} ${path.fromY} C ${path.fromX} ${path.fromY + dy/2}, ${path.toX} ${path.fromY + dy/2}, ${path.toX} ${path.toY}`;
                    
                    return (
                      <path
                        key={path.id}
                        d={curvePath}
                        className={`svg-path-line`}
                        stroke={path.isMerge ? '#444' : '#888'}
                        strokeDasharray={path.isMerge ? '3,3' : undefined}
                        opacity={path.isMerge ? 0.4 : 0.8}
                        markerStart={path.fromY > path.toY ? "url(#arrow-mono)" : undefined}
                      />
                    );
                  })}

                  {/* 2. Draw commit nodes circles (monochrome) */}
                  {graphLayout.nodes.map((node) => {
                    const isHead = node.isHead || (node.branches && node.branches.includes(activeBranchName));
                    
                    return (
                      <g 
                        key={node.hash}
                        className={`svg-commit-node ${isHead ? 'active-head' : ''}`}
                        transform={`translate(${node.x}, ${node.y})`}
                        onMouseEnter={(e) => {
                          setHoveredCommit(node);
                          const rect = e.currentTarget.getBoundingClientRect();
                          const containerRect = svgContainerRef.current.getBoundingClientRect();
                          setHoverPosition({
                            x: rect.left - containerRect.left + 25,
                            y: rect.top - containerRect.top - 80
                          });
                        }}
                        onMouseLeave={() => setHoveredCommit(null)}
                        onClick={() => handleCheckoutBranch(node.hash)}
                      >
                        {isHead && (
                          <circle 
                            r="11" 
                            fill="none" 
                            stroke="#ffffff" 
                            strokeWidth="2"
                            opacity="0.8"
                          />
                        )}

                        <circle 
                          r="6" 
                          fill={isHead ? '#ffffff' : '#000000'} 
                          stroke="#ffffff" 
                          strokeWidth="2"
                        />

                        <text x="18" y="4" className="svg-commit-text" style={{ fill: '#ffffff' }}>
                          {node.message.length > 36 ? `${node.message.substring(0, 36)}...` : node.message}
                        </text>
                        
                        <text x="18" y="16" className="svg-commit-hash">
                          {node.hash.substring(0, 8)} • {node.author}
                        </text>

                        {/* Branch Ref Tags (monochrome) */}
                        {node.branches && node.branches.map((bName, bIdx) => (
                          <g key={bName} transform={`translate(${320 + bIdx * 85}, -6)`}>
                            <rect 
                              width="80" 
                              height="18" 
                              rx="3" 
                              fill={bName === activeBranchName ? '#ffffff' : '#171717'}
                              stroke="#ffffff"
                              strokeWidth="1"
                            />
                            <text 
                              x="40" 
                              y="12" 
                              textAnchor="middle" 
                              fill={bName === activeBranchName ? '#000000' : '#ffffff'}
                              style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}
                            >
                              {bName.length > 12 ? `${bName.substring(0, 10)}..` : bName}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* Live Popover Tooltip for Commits */}
            <div 
              className={`commit-tooltip ${hoveredCommit ? 'visible' : ''}`}
              style={{ left: hoverPosition.x, top: hoverPosition.y }}
            >
              {hoveredCommit && (
                <>
                  <div className="tooltip-header">
                    <span className="tooltip-hash">{hoveredCommit.hash.substring(0, 8)}</span>
                    <span className="tooltip-date">{new Date(hoveredCommit.date).toLocaleDateString()}</span>
                  </div>
                  <div className="tooltip-msg">
                    {hoveredCommit.message}
                  </div>
                  <div className="tooltip-meta">
                    <span><b>Author:</b> {hoveredCommit.author}</span>
                    <span><b>Email:</b> {hoveredCommit.email}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* SIDEBAR RIGHT: AI Commit message generator & conventional builder */}
        <aside className="sidebar-panel right">
          {/* Tabs header */}
          <div className="tab-header">
            <button 
              className={`tab-btn ${activeRightTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('ai')}
            >
              <Sparkles size={14} />
              <span>AI Prompt</span>
            </button>
            <button 
              className={`tab-btn ${activeRightTab === 'builder' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('builder')}
            >
              <BookOpen size={14} />
              <span>Builder</span>
            </button>
            <button 
              className={`tab-btn ${activeRightTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('guide')}
            >
              <Info size={14} />
              <span>Guide</span>
            </button>
          </div>

          <div className="panel-content">
            
            {/* TAB 1: AI Prompt Suggester */}
            {activeRightTab === 'ai' && (
              <div>
                <div className="input-group">
                  <div style={{ display: 'flex', justifyContext: 'space-between', alignItems: 'center' }}>
                    <label className="input-label">What changes did you make?</label>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>ID/EN</span>
                  </div>
                  <textarea 
                    className="textarea-custom" 
                    placeholder="e.g. membuat validasi form login dan benerin import CSS"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (userPrompt.trim()) {
                        const s = generateCommitSuggestions(userPrompt);
                        setAiSuggestions(s);
                      }
                    }}
                    disabled={!userPrompt.trim()}
                  >
                    <Sparkles size={13} />
                    Generate
                  </button>

                  <button 
                    className="btn-secondary" 
                    onClick={handleAnalyzeRealDiff}
                    title="Analyze actual unstaged file modifications"
                  >
                    <Zap size={13} />
                    Analyze Diff
                  </button>
                </div>

                {/* AI generated suggestion cards */}
                {aiSuggestions.length > 0 && (
                  <div className="suggestions-list">
                    <div className="status-header">Suggested messages</div>
                    
                    {aiSuggestions.map(sug => (
                      <div key={sug.id} className="suggestion-card">
                        <div className="suggestion-card-header">
                          <span className="suggestion-badge">{sug.label}</span>
                          <span className="suggestion-desc">{sug.description}</span>
                        </div>
                        
                        <div className="suggestion-text-box">
                          {sug.message}
                        </div>

                        <div className="suggestion-actions">
                          <button className="btn-icon-label" onClick={() => copyToClipboard(sug.message)}>
                            Copy
                          </button>
                          
                          <button 
                            className="btn-icon-label commit-btn"
                            onClick={() => handleApplyCommit(sug.message)}
                          >
                            Commit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {aiSuggestions.length === 0 && (
                  <div className="empty-state-mono" style={{ marginTop: 24 }}>
                    <Sparkles size={20} />
                    <p style={{ fontSize: 11.5 }}>Describe your edits above or click "Analyze Diff" to generate formatted commit codes.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Conventional Step Builder */}
            {activeRightTab === 'builder' && (
              <div className="builder-form">
                <div className="input-group">
                  <label className="input-label">Commit Type</label>
                  <select 
                    className="select-custom"
                    value={builderType}
                    onChange={(e) => setBuilderType(e.target.value)}
                  >
                    <option value="feat">feat (New Feature)</option>
                    <option value="fix">fix (Bug Fix)</option>
                    <option value="docs">docs (Documentation)</option>
                    <option value="style">style (Styling)</option>
                    <option value="refactor">refactor (Refactor)</option>
                    <option value="perf">perf (Performance)</option>
                    <option value="test">test (Tests)</option>
                    <option value="chore">chore (Build/Deps)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Scope (optional)</label>
                  <input 
                    type="text" 
                    className="input-custom" 
                    placeholder="e.g. auth, api"
                    value={builderScope}
                    onChange={(e) => setBuilderScope(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Subject / Short Summary</label>
                  <input 
                    type="text" 
                    className="input-custom" 
                    placeholder="e.g. add google oauth logic"
                    value={builderSubject}
                    onChange={(e) => setBuilderSubject(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Body (optional)</label>
                  <textarea 
                    className="textarea-custom" 
                    placeholder="e.g. - Add auth client config"
                    value={builderBody}
                    onChange={(e) => setBuilderBody(e.target.value)}
                  />
                </div>

                <label className="checkbox-label-container">
                  <input 
                    type="checkbox" 
                    className="checkbox-custom"
                    checked={builderBreaking}
                    onChange={(e) => setBuilderBreaking(e.target.checked)}
                  />
                  <span>Introduce Breaking Change (!)</span>
                </label>

                <div style={{ marginTop: 10 }}>
                  <label className="input-label">Commit Preview</label>
                  <div className="suggestion-text-box" style={{ marginTop: 6, borderColor: '#ffffff' }}>
                    {conventionalPreview}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => copyToClipboard(conventionalPreview)}>
                    Copy Preview
                  </button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleApplyCommit(conventionalPreview)}>
                    Commit
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Guide */}
            {activeRightTab === 'guide' && (
              <div className="guide-section">
                <div className="status-header">Git Cheat Sheet</div>
                
                <div className="guide-card">
                  <div className="guide-cmd">git commit -m "message"</div>
                  <div className="guide-desc">Commits staged modifications. Adding prefixes like <code>feat:</code> fits conventional standards.</div>
                </div>

                <div className="guide-card">
                  <div className="guide-cmd">git branch &lt;name&gt;</div>
                  <div className="guide-desc">Creates a branch tracking off current HEAD commit.</div>
                </div>

                <div className="guide-card">
                  <div className="guide-cmd">git checkout &lt;name&gt;</div>
                  <div className="guide-desc">Switches local workspace active head ref pointer.</div>
                </div>

                <div className="guide-card">
                  <div className="guide-cmd">git merge &lt;branch&gt;</div>
                  <div className="guide-desc">Merges branch commit states into current active HEAD.</div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 3. BOTTOM PANEL: Retro Terminal Console Shell */}
      <footer className="terminal-panel">
        <div className="terminal-header">
          <div className="terminal-title">
            <Terminal size={12} />
            <span>Workspace Interactive Terminal</span>
          </div>
          <div className="terminal-dots">
            <span className="terminal-dot close"></span>
            <span className="terminal-dot minimize"></span>
            <span className="terminal-dot maximize"></span>
          </div>
        </div>

        <div className="terminal-body">
          {terminalLogs.map((log, idx) => (
            <div key={idx} className={`terminal-row ${log.type}`}>
              {log.type === 'command' && <span className="terminal-prompt">&gt;</span>}
              <span>{log.text}</span>
            </div>
          ))}
          <div ref={terminalEndRef} />

          <form className="terminal-input-row" onSubmit={handleTerminalSubmit}>
            <span className="terminal-prompt">&gt;</span>
            <input 
              type="text" 
              className="terminal-input"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Type git command... (e.g. git log or git status)"
              autoFocus
            />
          </form>
        </div>
      </footer>

      {/* --- FLOATING TOAST NOTIFICATION --- */}
      {toast.visible && (
        <div 
          className="toast-notification-mono"
        >
          <CheckCircle2 size={14} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- CREATE BRANCH MODAL --- */}
      {showNewBranchModal && (
        <div className="modal-overlay" onClick={() => setShowNewBranchModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 380 }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Local Branch</h2>
              <button className="modal-close-btn" onClick={() => setShowNewBranchModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20 }}>
              <div className="input-group">
                <label className="input-label">Branch Name</label>
                <input 
                  type="text" 
                  className="input-custom" 
                  placeholder="e.g. feature/api-routes"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                Branches off current active branch: <b>{activeBranchName}</b>.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContext: 'flex-end', marginTop: 20 }}>
                <button className="btn-secondary" onClick={() => setShowNewBranchModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCreateBranch}>Create Branch</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW FILE DIFF MODAL --- */}
      {showDiffModal && activeDiffFile && (
        <div className="modal-overlay" onClick={() => setShowDiffModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                diff --git a/{activeDiffFile.path} b/{activeDiffFile.path}
              </h2>
              <button className="modal-close-btn" onClick={() => setShowDiffModal(false)}>&times;</button>
            </div>
            
            <div className="diff-container">
              {diffContent.split('\n').map((line, idx) => {
                let type = 'normal';
                if (line.startsWith('+') && !line.startsWith('+++')) type = 'addition';
                else if (line.startsWith('-') && !line.startsWith('---')) type = 'deletion';
                else if (line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index')) type = 'meta';

                return (
                  <div key={idx} className={`diff-line ${type}`}>
                    {line}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Status: <b>{activeDiffFile.isStaged ? 'Staged' : 'Unstaged'}</b>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => setShowDiffModal(false)}>Close</button>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    handleToggleStageFile(activeDiffFile);
                    setShowDiffModal(false);
                  }}
                >
                  {activeDiffFile.isStaged ? 'Unstage' : 'Stage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
