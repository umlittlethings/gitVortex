// Git Sandbox Simulator
// Manages simulated git repo state, branches, and commits

export const createInitialSandbox = () => {
  const initialCommits = {
    'a1b2c3d4': {
      hash: 'a1b2c3d4',
      parents: [],
      message: 'chore: initial commit',
      author: 'gitdeveloper',
      email: 'dev@tools.io',
      date: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
      branch: 'main'
    },
    'f5e6d7c8': {
      hash: 'f5e6d7c8',
      parents: ['a1b2c3d4'],
      message: 'feat: add database schema & basic tables',
      author: 'gitdeveloper',
      email: 'dev@tools.io',
      date: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
      branch: 'main'
    },
    'd9c8b7a6': {
      hash: 'd9c8b7a6',
      parents: ['f5e6d7c8'],
      message: 'feat: implement user authentication flow',
      author: 'gitdeveloper',
      email: 'dev@tools.io',
      date: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      branch: 'main'
    }
  };

  const initialBranches = {
    'main': 'd9c8b7a6',
    'feature/dashboard': 'f5e6d7c8' // diverged at second commit
  };

  return {
    commits: initialCommits,
    branches: initialBranches,
    activeBranch: 'main',
    headCommit: 'd9c8b7a6'
  };
};

// Generates a random hash for commits
export const generateHash = () => {
  return Math.random().toString(16).substring(2, 10);
};

// 1. Commit operation
export const gitCommit = (state, message, author = 'gitdeveloper', email = 'dev@tools.io') => {
  const newHash = generateHash();
  const parent = state.headCommit;
  const isDetached = !state.branches[state.activeBranch];

  const newCommit = {
    hash: newHash,
    parents: parent ? [parent] : [],
    message,
    author,
    email,
    date: new Date().toISOString(),
    branch: isDetached ? 'detached' : state.activeBranch
  };

  const updatedCommits = { ...state.commits, [newHash]: newCommit };
  const updatedBranches = { ...state.branches };
  
  if (!isDetached) {
    updatedBranches[state.activeBranch] = newHash;
  }

  return {
    ...state,
    commits: updatedCommits,
    branches: updatedBranches,
    headCommit: newHash
  };
};

// 2. Branch creation
export const gitBranch = (state, branchName) => {
  if (!branchName || branchName.trim() === '') {
    return { ...state, error: 'Branch name cannot be empty' };
  }
  
  const cleanName = branchName.trim().replace(/\s+/g, '-');
  if (state.branches[cleanName]) {
    return { ...state, error: `Branch "${cleanName}" already exists` };
  }

  return {
    ...state,
    branches: {
      ...state.branches,
      [cleanName]: state.headCommit
    },
    error: null
  };
};

// 3. Checkout branch or commit
export const gitCheckout = (state, target) => {
  if (state.branches[target]) {
    // Checking out a branch
    return {
      ...state,
      activeBranch: target,
      headCommit: state.branches[target],
      error: null
    };
  } else if (state.commits[target]) {
    // Checking out a commit (detached HEAD)
    return {
      ...state,
      activeBranch: `(HEAD detached at ${target.substring(0, 8)})`,
      headCommit: target,
      error: null
    };
  } else {
    return { ...state, error: `Pathspec "${target}" did not match any file(s) known to git` };
  }
};

// 4. Merge branch
export const gitMerge = (state, sourceBranch, author = 'gitdeveloper', email = 'dev@tools.io') => {
  if (!state.branches[sourceBranch]) {
    return { ...state, error: `Branch "${sourceBranch}" does not exist` };
  }

  const targetCommitHash = state.branches[sourceBranch];
  const currentCommitHash = state.headCommit;

  if (targetCommitHash === currentCommitHash) {
    return { ...state, error: 'Already up to date.' };
  }

  // Check if we can fast-forward (current is ancestor of target)
  const isAncestor = checkIfAncestor(state.commits, currentCommitHash, targetCommitHash);
  if (isAncestor) {
    // Fast forward merge
    const updatedBranches = { ...state.branches };
    const isDetached = !state.branches[state.activeBranch];
    if (!isDetached) {
      updatedBranches[state.activeBranch] = targetCommitHash;
    }

    return {
      ...state,
      branches: updatedBranches,
      headCommit: targetCommitHash,
      error: null,
      message: 'Fast-forward merged.'
    };
  }

  // Check if current is already ahead (target is ancestor of current)
  const isTargetAncestor = checkIfAncestor(state.commits, targetCommitHash, currentCommitHash);
  if (isTargetAncestor) {
    return { ...state, error: 'Already up-to-date (current branch is ahead).' };
  }

  // Create a Merge Commit (3-way merge)
  const newHash = generateHash();
  const isDetached = !state.branches[state.activeBranch];
  const newCommit = {
    hash: newHash,
    parents: [currentCommitHash, targetCommitHash],
    message: `Merge branch '${sourceBranch}' into ${isDetached ? 'HEAD' : state.activeBranch}`,
    author,
    email,
    date: new Date().toISOString(),
    branch: isDetached ? 'detached' : state.activeBranch,
    isMerge: true
  };

  const updatedCommits = { ...state.commits, [newHash]: newCommit };
  const updatedBranches = { ...state.branches };
  
  if (!isDetached) {
    updatedBranches[state.activeBranch] = newHash;
  }

  return {
    ...state,
    commits: updatedCommits,
    branches: updatedBranches,
    headCommit: newHash,
    error: null,
    message: 'Merge made by the standard recursive strategy.'
  };
};

// 5. Rebase branch
export const gitRebase = (state, targetBranch, author = 'gitdeveloper', email = 'dev@tools.io') => {
  if (!state.branches[targetBranch]) {
    return { ...state, error: `Branch "${targetBranch}" does not exist` };
  }

  const targetCommitHash = state.branches[targetBranch];
  const currentCommitHash = state.headCommit;

  if (targetCommitHash === currentCommitHash) {
    return { ...state, error: 'Already up to date.' };
  }

  // Find common ancestor (LCA)
  const ancestorHash = findCommonAncestor(state.commits, currentCommitHash, targetCommitHash);
  if (!ancestorHash) {
    return { ...state, error: 'Could not find a common ancestor. Rebase aborted.' };
  }

  if (ancestorHash === targetCommitHash) {
    return { ...state, error: 'Already up-to-date (current is ahead of rebase target).' };
  }

  // Trace commits on current branch back to ancestor
  const uniqueCommits = [];
  let curr = currentCommitHash;
  while (curr && curr !== ancestorHash) {
    const commit = state.commits[curr];
    if (!commit) break;
    uniqueCommits.unshift(commit); // Order from oldest to newest
    // For simplicity, follow first parent
    curr = commit.parents[0];
  }

  if (uniqueCommits.length === 0) {
    // Current is ancestor of target -> Fast forward instead!
    const updatedBranches = { ...state.branches };
    const isDetached = !state.branches[state.activeBranch];
    if (!isDetached) {
      updatedBranches[state.activeBranch] = targetCommitHash;
    }
    return {
      ...state,
      branches: updatedBranches,
      headCommit: targetCommitHash,
      error: null,
      message: 'Fast-forwarded to rebase target.'
    };
  }

  // Play unique commits on top of targetCommitHash
  let lastHash = targetCommitHash;
  const newCommits = { ...state.commits };

  for (const origCommit of uniqueCommits) {
    const copyHash = generateHash();
    newCommits[copyHash] = {
      hash: copyHash,
      parents: [lastHash],
      message: `${origCommit.message} (rebased)`,
      author: origCommit.author,
      email: origCommit.email,
      date: new Date().toISOString(),
      branch: state.activeBranch
    };
    lastHash = copyHash;
  }

  const updatedBranches = { ...state.branches };
  const isDetached = !state.branches[state.activeBranch];
  if (!isDetached) {
    updatedBranches[state.activeBranch] = lastHash;
  }

  return {
    ...state,
    commits: newCommits,
    branches: updatedBranches,
    headCommit: lastHash,
    error: null,
    message: `Successfully rebased and updated refs/heads/${state.activeBranch}.`
  };
};

// Helper: check if 'potentialAncestor' is indeed an ancestor of 'commitHash'
function checkIfAncestor(commits, potentialAncestor, commitHash) {
  if (potentialAncestor === commitHash) return true;
  
  const visited = new Set();
  const queue = [commitHash];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === potentialAncestor) return true;

    const commit = commits[current];
    if (commit && commit.parents) {
      for (const p of commit.parents) {
        if (!visited.has(p)) {
          visited.add(p);
          queue.push(p);
        }
      }
    }
  }

  return false;
}

// Helper: Find Lowest Common Ancestor
function findCommonAncestor(commits, hash1, hash2) {
  const getAncestors = (hash) => {
    const ancestors = new Set();
    const queue = [hash];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      ancestors.add(current);
      const commit = commits[current];
      if (commit && commit.parents) {
        commit.parents.forEach(p => {
          if (!ancestors.has(p)) {
            queue.push(p);
          }
        });
      }
    }
    return ancestors;
  };

  const ancestors1 = getAncestors(hash1);
  
  // BFS search starting from hash2 to find the first commit present in ancestors1
  const queue = [hash2];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (ancestors1.has(current)) return current; // Found common ancestor

    const commit = commits[current];
    if (commit && commit.parents) {
      commit.parents.forEach(p => {
        if (!visited.has(p)) {
          visited.add(p);
          queue.push(p);
        }
      });
    }
  }

  return null;
}
