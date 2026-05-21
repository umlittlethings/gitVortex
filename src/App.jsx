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
  Info,
  Play,
  RotateCcw,
  BookOpenCheck
} from 'lucide-react';
import './App.css';

// Import commit suggester helper
import { generateCommitSuggestions } from './commitSuggester';

// Import our simulator helpers for the interactive academy
import { 
  createInitialSandbox, 
  gitCommit, 
  gitBranch, 
  gitCheckout, 
  gitMerge, 
  gitRebase 
} from './gitSimulator';

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
    { type: 'output', text: '⚡ GitVortex Live Shell v2.1.0 (Academy Edition)' },
    { type: 'output', text: 'Watching your local repository directory.' },
    { type: 'output', text: 'Type "help" to list available git commands.' }
  ]);
  const terminalEndRef = useRef(null);

  // --- Branch Creation Form State ---
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);

  // --- Notification Toast ---
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // --- INTERACTIVE ACADEMY STATE ---
  const [showAcademyModal, setShowAcademyModal] = useState(false);
  const [academyState, setAcademyState] = useState(createInitialSandbox());
  const [academyActiveLesson, setAcademyActiveLesson] = useState(0);
  const [academyCustomCommand, setAcademyCustomCommand] = useState('');
  const [academyTerminalLogs, setAcademyTerminalLogs] = useState([
    { type: 'output', text: '⚡ Academy Sandbox Console Active. Commands execute in simulation.' }
  ]);

  // Lessons content matrices
  const academyLessons = [
    {
      title: '1. The Git Commit (git commit)',
      concept: 'A commit is a physical snapshot of your project state. In git, commits form a directed graph where each commit points back to its parent ancestors. Committing stores state without affecting other tracks.',
      instruction: 'Click "Execute Commit" to simulate spawning a new commit node. Notice that the commit extends from your current active branch pointer.',
      actionLabel: 'Execute git commit',
      action: () => {
        setAcademyState(prev => gitCommit(prev, `feat: add lesson commit ${Math.random().toString(36).substring(2, 6)}`));
        logAcademy('git commit -m "feat: add lesson commit"', 'output', 'Commit generated in sandbox successfully.');
      }
    },
    {
      title: '2. Lightweight Branching (git branch)',
      concept: 'Branches in Git are incredibly lightweight! A branch is simply a named pointer tracking a specific commit hash. Creating a branch does not duplicate code—it just drafts a new tag pointing to HEAD.',
      instruction: 'Click "Create Branch" to simulate adding a new branch tag named "feature/auth" at your current commit hash.',
      actionLabel: 'Execute git branch feature/auth',
      action: () => {
        setAcademyState(prev => gitBranch(prev, 'feature/auth'));
        logAcademy('git branch feature/auth', 'output', 'Created local branch feature/auth pointing to current HEAD.');
      }
    },
    {
      title: '3. Swapping Streams (git checkout)',
      concept: 'Checkout switches your workspace. HEAD is simply a pointer showing where your active files point. If you checkout a specific commit hash rather than a branch pointer, you enter a "Detached HEAD" state.',
      instruction: 'Click "Checkout feature/auth" to switch branch pointers, or "Checkout main" to switch back. Watch the HEAD ring node slide instantly on the SVG.',
      actionLabel: 'Execute git checkout feature/auth',
      action: () => {
        setAcademyState(prev => gitCheckout(prev, 'feature/auth'));
        logAcademy('git checkout feature/auth', 'output', 'Switched sandbox context to branch "feature/auth"');
      }
    },
    {
      title: '4. Preserving Context (git merge)',
      concept: 'Merging integrates separate branch developments. If the target branch is a direct ancestor of the current branch, git runs a fast-forward merge (moving the pointer). Otherwise, it makes a "3-Way Merge Commit" joining both parent histories.',
      instruction: 'Checkout "main" and click "Merge" to combine changes, making a beautiful curved junction in the visualizer.',
      actionLabel: 'Execute git merge feature/dashboard',
      action: () => {
        setAcademyState(prev => gitMerge(prev, 'feature/dashboard'));
        logAcademy('git merge feature/dashboard', 'output', 'Merged sandbox branch. Merge commit created with multiple parent connections.');
      }
    },
    {
      title: '5. Linear History Rebase (git rebase)',
      concept: 'Rebasing is the most elegant alternative to merges. Instead of creating a messy merge commit, rebasing temporarily holds your unique branch commits, shifts the base of your branch to the target branch HEAD, and replays each of your commits one-by-one as new commits.',
      instruction: 'Switch to "feature/dashboard" and click "Rebase main" to watch your commits detach and re-append linearly on top of main, creating a perfectly clean straight timeline!',
      actionLabel: 'Execute git rebase main',
      action: () => {
        setAcademyState(prev => gitRebase(prev, 'main'));
        logAcademy('git rebase main', 'output', 'Rebase complete. Unique commits replayed linearly on top of master.');
      }
    }
  ];

  const logAcademy = (cmdText, outType, outText) => {
    setAcademyTerminalLogs(prev => [
      ...prev,
      { type: 'command', text: cmdText },
      { type: outType, text: outText }
    ]);
  };

  // ----------------------------------------------------
  // EFFECT: Fetch Local Repo Info on mount/path change
  // ----------------------------------------------------
  useEffect(() => {
    fetchLocalRepoData();
    const interval = setInterval(() => {
      fetchLocalRepoData(true);
    }, 4000); 
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
    const spacingX = 75;
    const startX = 60;

    // 2. Map nodes
    const nodes = commits.map((commit, idx) => {
      let lane = 0;
      if (commit.branches && commit.branches.length > 0) {
        const matchingBranch = commit.branches.find(b => branchLanes[b] !== undefined);
        if (matchingBranch) lane = branchLanes[matchingBranch];
      } else {
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
  // ACADEMY SIMULATOR COORDINATES ENGINE
  // ----------------------------------------------------
  const academyLayout = useMemo(() => {
    const commits = Object.values(academyState.commits);
    const branches = Object.keys(academyState.branches).map(name => ({
      name,
      commitHash: academyState.branches[name]
    }));

    if (commits.length === 0) return { nodes: [], paths: [], height: 200 };

    const branchLanes = {};
    let laneCounter = 0;

    // Put main always first, then feature/dashboard, then other branches
    const sortedBranches = ['main', 'feature/dashboard'];
    Object.keys(academyState.branches).forEach(b => {
      if (!sortedBranches.includes(b)) sortedBranches.push(b);
    });

    sortedBranches.forEach(b => {
      branchLanes[b] = laneCounter++;
    });

    const startY = 40;
    const spacingY = 52;
    const spacingX = 65;
    const startX = 50;

    const nodes = commits.sort((a, b) => new Date(a.date) - new Date(b.date)).map((commit, idx) => {
      const lane = branchLanes[commit.branch] ?? 0;
      const x = startX + lane * spacingX;
      const y = startY + idx * spacingY;
      return {
        ...commit,
        x,
        y,
        lane
      };
    });

    const paths = [];
    nodes.forEach(node => {
      if (node.parents) {
        node.parents.forEach(parentHash => {
          const parentNode = nodes.find(n => n.hash === parentHash);
          if (parentNode) {
            paths.push({
              id: `${node.hash}-${parentNode.hash}`,
              fromX: parentNode.x,
              fromY: parentNode.y,
              toX: node.x,
              toY: node.y,
              lane: parentNode.lane,
              isMerge: node.parents.length > 1
            });
          }
        });
      }
    });

    return {
      nodes,
      paths,
      height: Math.max(startY + commits.length * spacingY + 30, 300)
    };
  }, [academyState]);

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

  const handleApplyCommit = async (message) => {
    if (!message || message.trim() === '') {
      showToast('Commit message is empty', 'error');
      return;
    }

    setLoadingLocal(true);
    const addRes = await runLocalCommand('add', { file: '.' });
    if (!addRes.success) {
      showToast(`Add failed: ${addRes.error}`, 'error');
      setLoadingLocal(false);
      return;
    }

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
  // ACADEMY SIMULATION INPUT EXECUTION
  // ----------------------------------------------------
  const handleAcademyCustomSubmit = (e) => {
    e.preventDefault();
    if (!academyCustomCommand.trim()) return;

    const fullCmd = academyCustomCommand.trim();
    setAcademyCustomCommand('');

    const args = fullCmd.split(/\s+/);
    if (args[0] !== 'git') {
      setAcademyTerminalLogs(prev => [...prev, { type: 'command', text: fullCmd }, { type: 'error', text: `command not found: ${args[0]}. Try: git commit, git branch <name>, git checkout <name>` }]);
      return;
    }

    const action = args[1];
    if (action === 'commit') {
      setAcademyState(prev => gitCommit(prev, args[2] ? args.slice(2).join(' ').replace(/['"]/g, '') : 'simulated development commit'));
      logAcademy(fullCmd, 'output', 'Simulated commit spawned successfully.');
    } else if (action === 'branch') {
      if (!args[2]) {
        logAcademy(fullCmd, 'error', 'Branch name parameter required.');
        return;
      }
      setAcademyState(prev => gitBranch(prev, args[2]));
      logAcademy(fullCmd, 'output', `Simulated branch "${args[2]}" created at HEAD.`);
    } else if (action === 'checkout') {
      if (!args[2]) {
        logAcademy(fullCmd, 'error', 'Checkout target parameter required.');
        return;
      }
      setAcademyState(prev => gitCheckout(prev, args[2]));
      logAcademy(fullCmd, 'output', `Switched workspace active HEAD to "${args[2]}".`);
    } else if (action === 'merge') {
      if (!args[2]) {
        logAcademy(fullCmd, 'error', 'Merge branch parameter required.');
        return;
      }
      const prev = academyState;
      const next = gitMerge(prev, args[2]);
      if (next.error) {
        logAcademy(fullCmd, 'error', next.error);
      } else {
        setAcademyState(next);
        logAcademy(fullCmd, 'output', next.message || 'Merged successfully.');
      }
    } else if (action === 'rebase') {
      if (!args[2]) {
        logAcademy(fullCmd, 'error', 'Rebase target parameter required.');
        return;
      }
      const prev = academyState;
      const next = gitRebase(prev, args[2]);
      if (next.error) {
        logAcademy(fullCmd, 'error', next.error);
      } else {
        setAcademyState(next);
        logAcademy(fullCmd, 'output', next.message || 'Rebase complete.');
      }
    } else {
      logAcademy(fullCmd, 'error', `Academy sandbox: Unsupported command "${action}". Supported: commit, branch, checkout, merge, rebase.`);
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
          
          <div className="panel-content" style={{ maxHeight: '25%', overflowY: 'auto' }}>
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
          
          <div className="panel-content" style={{ maxHeight: '20%', overflowY: 'auto' }}>
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

          <div className="panel-content" style={{ overflowY: 'auto', maxHeight: '25%' }}>
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

          {/* Section D: Git Operations */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div className="panel-title">
              <Zap size={14} />
              <span>Git Quick Actions</span>
            </div>
          </div>
          
          <div className="panel-content" style={{ overflowY: 'auto', flex: 1 }}>
            {localBranchesList.length > 1 ? (
              <div className="builder-form" style={{ gap: 8 }}>
                <div className="input-group" style={{ marginBottom: 4 }}>
                  <label className="input-label" style={{ fontSize: 9 }}>Select Branch for actions</label>
                  <select 
                    className="select-custom" 
                    id="git-op-branch"
                    style={{ fontSize: 11, padding: 4 }}
                  >
                    {localBranchesList.filter(b => !b.isActive).map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '4px 8px', fontSize: 10 }}
                    onClick={() => {
                      const sel = document.getElementById('git-op-branch')?.value;
                      if (sel) handleQuickMerge(sel);
                    }}
                  >
                    Merge
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '4px 8px', fontSize: 10 }}
                    onClick={() => {
                      const sel = document.getElementById('git-op-branch')?.value;
                      if (sel) handleQuickRebase(sel);
                    }}
                  >
                    Rebase
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state-mono" style={{ fontSize: 10.5, padding: 8, marginBottom: 8 }}>
                Create another branch to enable Quick Merge/Rebase.
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)' }}
                onClick={async () => {
                  const res = await runLocalCommand('raw', { command: 'git stash' });
                  if (res.success) {
                    showToast('Changes stashed!', 'success');
                    setTerminalLogs(prev => [...prev, { type: 'command', text: 'git stash' }, { type: 'output', text: res.stdout || 'Saved working directory changes.' }]);
                  }
                }}
              >
                Stash
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)' }}
                onClick={async () => {
                  const res = await runLocalCommand('raw', { command: 'git stash pop' });
                  if (res.success) {
                    showToast('Stash popped!', 'success');
                    setTerminalLogs(prev => [...prev, { type: 'command', text: 'git stash pop' }, { type: 'output', text: res.stdout || 'Popped stashed commits.' }]);
                  }
                }}
              >
                Unstash
              </button>
            </div>

            <button 
              className="btn-secondary" 
              style={{ width: '100%', padding: '4px 8px', fontSize: 10, marginTop: 6, color: 'var(--text-muted)', borderColor: '#525252' }}
              onClick={async () => {
                if (window.confirm('Are you sure you want to run hard reset? Uncommitted changes will be lost.')) {
                  const res = await runLocalCommand('reset-hard');
                  if (res.success) {
                    showToast('HEAD reset successfully', 'success');
                    setTerminalLogs(prev => [...prev, { type: 'command', text: 'git reset --hard HEAD' }, { type: 'output', text: 'HEAD is now at newest commit.' }]);
                  }
                }
              }}
            >
              Reset Hard HEAD
            </button>
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
                
                {/* Visual Academy Activation Block */}
                <div style={{ background: '#070707', border: '1px solid #ffffff', padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <BookOpenCheck size={14} style={{ color: '#ffffff' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>GIT VISUAL ACADEMY</span>
                  </div>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.3, marginBottom: 10 }}>
                    Understand merges, branching topologies, and commit rebasing interactively inside our animated sandbox workspace!
                  </p>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '6px 10px', fontSize: 10.5 }}
                    onClick={() => {
                      setAcademyState(createInitialSandbox());
                      setAcademyActiveLesson(0);
                      setShowAcademyModal(true);
                    }}
                  >
                    🎓 Open Git Academy
                  </button>
                </div>

                <div className="status-header">Git Command Reference</div>
                
                <div className="guide-card">
                  <div className="guide-cmd">git rebase &lt;branch&gt;</div>
                  <div className="guide-desc">Temporarily holds local branch commits, shifts branch base, and replays each of them linearly on top of target branch HEAD.</div>
                </div>

                <div className="guide-card">
                  <div className="guide-cmd">git merge &lt;branch&gt;</div>
                  <div className="guide-desc">Combines branch logs. Standard merging creates a new visual '3-way merge commit' with multiple parent connections.</div>
                </div>

                <div className="guide-card">
                  <div className="guide-cmd">git stash</div>
                  <div className="guide-desc">Safely stashes uncommitted modifications, leaving the working directory clean without committing.</div>
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

      {/* --- INTERACTIVE GIT VISUAL ACADEMY OVERLAY MODAL --- */}
      {showAcademyModal && (
        <div className="modal-overlay" onClick={() => setShowAcademyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 1080, height: '80vh', maxWidth: '95%' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpenCheck size={18} />
                <span className="modal-title" style={{ fontSize: 14 }}>Git Visual Academy & Playground Sandbox</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAcademyModal(false)}>&times;</button>
            </div>

            {/* Modal Body Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#000000' }}>
              
              {/* Left Panel: Lessons list & selectors */}
              <div style={{ width: 320, borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: '#050505', overflowY: 'auto' }}>
                <div style={{ padding: '12px 16px', background: '#0c0c0c', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5 }}>Simulated Course Tasks</span>
                  <button 
                    className="canvas-btn" 
                    title="Reset Simulation Repository"
                    style={{ width: 22, height: 22 }}
                    onClick={() => {
                      setAcademyState(createInitialSandbox());
                      setAcademyActiveLesson(0);
                      setAcademyTerminalLogs([{ type: 'output', text: '⚡ Academy Sandbox Repository Reset.' }]);
                    }}
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>

                {/* Lesson Navigation items */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {academyLessons.map((les, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setAcademyActiveLesson(idx)}
                      style={{ 
                        padding: 10,
                        border: '1px solid',
                        borderColor: academyActiveLesson === idx ? '#ffffff' : 'var(--border-light)',
                        background: academyActiveLesson === idx ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <h4 style={{ fontSize: 11.5, fontWeight: 700, color: academyActiveLesson === idx ? '#ffffff' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {les.title}
                      </h4>
                    </div>
                  ))}
                </div>

                {/* Selected Lesson Explainer */}
                <div style={{ padding: 16, borderTop: '1px solid var(--border-light)', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span className="input-label" style={{ fontSize: 9 }}>The Concept</span>
                    <p style={{ fontSize: 11.5, color: '#ffffff', lineHeight: 1.4, marginTop: 4 }}>
                      {academyLessons[academyActiveLesson].concept}
                    </p>
                  </div>

                  <div style={{ background: '#0e0e0e', padding: 10, borderLeft: '2px solid #ffffff' }}>
                    <span className="input-label" style={{ fontSize: 8.5 }}>Task Instructions</span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, marginTop: 2 }}>
                      {academyLessons[academyActiveLesson].instruction}
                    </p>
                  </div>

                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '8px 12px', fontSize: 11, marginTop: 'auto' }}
                    onClick={academyLessons[academyActiveLesson].action}
                  >
                    <Play size={11} />
                    {academyLessons[academyActiveLesson].actionLabel}
                  </button>
                </div>
              </div>

              {/* Middle Section: Visualizer Sandbox Tree */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-light)', padding: '4px 10px', fontSize: 9.5, fontFamily: 'var(--font-mono)', zIndex: 10 }}>
                  ACTIVE HEAD: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{academyState.activeBranch}</span>
                </div>

                {/* SVG Visual Canvas for Simulation */}
                <div style={{ flex: 1, cursor: 'grab', background: '#020202', overflow: 'hidden' }}>
                  <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                    <defs>
                      <marker 
                        id="arrow-academy" 
                        viewBox="0 0 10 10" 
                        refX="6" 
                        refY="5" 
                        markerWidth="6" 
                        markerHeight="6" 
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 2 L 10 5 L 0 8 z" fill="#737373" />
                      </marker>
                    </defs>

                    <g transform="translate(60, 40) scale(0.9)">
                      {/* Paths */}
                      {academyLayout.paths.map((path) => {
                        const dy = path.toY - path.fromY;
                        const curvePath = `M ${path.fromX} ${path.fromY} C ${path.fromX} ${path.fromY + dy/2}, ${path.toX} ${path.fromY + dy/2}, ${path.toX} ${path.toY}`;
                        return (
                          <path 
                            key={path.id}
                            d={curvePath}
                            fill="none"
                            stroke={path.isMerge ? '#444' : '#888'}
                            strokeWidth="2"
                            strokeDasharray={path.isMerge ? '3,3' : undefined}
                            markerStart={path.fromY > path.toY ? "url(#arrow-academy)" : undefined}
                            opacity={path.isMerge ? 0.4 : 0.8}
                          />
                        );
                      })}

                      {/* Nodes */}
                      {academyLayout.nodes.map((node) => {
                        const isHead = academyState.headCommit === node.hash;
                        const pointingBranches = Object.keys(academyState.branches).filter(bName => academyState.branches[bName] === node.hash);

                        return (
                          <g 
                            key={node.hash}
                            transform={`translate(${node.x}, ${node.y})`}
                            onClick={() => {
                              setAcademyState(prev => gitCheckout(prev, node.hash));
                              logAcademy(`git checkout ${node.hash.substring(0, 8)}`, 'output', `Checked out simulated commit ${node.hash.substring(0, 8)} (detached HEAD)`);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {isHead && (
                              <circle r="10" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
                            )}
                            <circle r="5" fill={isHead ? '#ffffff' : '#000000'} stroke="#ffffff" strokeWidth="2" />
                            
                            <text x="14" y="3" style={{ fill: '#ffffff', fontSize: 10.5, fontFamily: 'var(--font-sans)', fontWeight: 600, pointerEvents: 'none' }}>
                              {node.message}
                            </text>
                            
                            <text x="14" y="13" style={{ fill: 'var(--text-dim)', fontSize: 9.5, fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>
                              {node.hash.substring(0, 8)}
                            </text>

                            {/* Simulated branch refs tags */}
                            {pointingBranches.map((brName, bIdx) => (
                              <g key={brName} transform={`translate(${230 + bIdx * 82}, -6)`}>
                                <rect width="78" height="16" rx="2" fill={brName === academyState.activeBranch ? '#ffffff' : '#171717'} stroke="#ffffff" strokeWidth="1" />
                                <text x="39" y="11" textAnchor="middle" fill={brName === academyState.activeBranch ? '#000000' : '#ffffff'} style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                                  {brName.length > 11 ? `${brName.substring(0, 9)}..` : brName}
                                </text>
                              </g>
                            ))}
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>

                {/* Retro simulated sub-console */}
                <div style={{ height: 160, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: '#000000', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <div style={{ background: '#0a0a0a', padding: '4px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Interactive Sandbox Console (Type Custom Actions Here)
                  </div>
                  <div style={{ flex: 1, padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {academyTerminalLogs.map((log, idx) => (
                      <div key={idx} style={{ display: 'flex', color: log.type === 'command' ? '#ffffff' : log.type === 'error' ? '#888888' : 'var(--text-muted)' }}>
                        {log.type === 'command' && <span style={{ marginRight: 6 }}>&gt;</span>}
                        <span>{log.text}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAcademyCustomSubmit} style={{ display: 'flex', padding: '6px 12px', background: '#050505', borderTop: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <span style={{ color: '#ffffff', marginRight: 6 }}>&gt;</span>
                    <input 
                      type="text" 
                      style={{ flex: 1, background: 'transparent', border: 'none', color: '#ffffff', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                      placeholder="Try: git commit, git branch <name>, git checkout <name>, git merge <branch>, git rebase <branch>"
                      value={academyCustomCommand}
                      onChange={e => setAcademyCustomCommand(e.target.value)}
                    />
                  </form>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
