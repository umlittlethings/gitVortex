import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Helper to run executive shell commands as promises
function execPromise(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        resolve({ error: error.message, stderr, stdout });
      } else {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), error: null });
      }
    });
  });
}

// Check if directory exists and is a git repository
export async function verifyGitRepo(repoPath) {
  if (!repoPath) {
    return { isValid: false, error: 'Path is required' };
  }
  
  const resolvedPath = path.resolve(repoPath);
  if (!fs.existsSync(resolvedPath)) {
    return { isValid: false, error: 'Directory does not exist' };
  }

  const { error, stdout } = await execPromise('git rev-parse --is-inside-work-tree', resolvedPath);
  if (error || stdout !== 'true') {
    return { isValid: false, error: 'Not a git repository (or git is not installed)' };
  }

  return { isValid: true, resolvedPath };
}

// Get branches and current HEAD
export async function getRepoInfo(repoPath) {
  const verify = await verifyGitRepo(repoPath);
  if (!verify.isValid) return verify;

  const cwd = verify.resolvedPath;

  // 1. Get current branch
  const headResult = await execPromise('git symbolic-ref --short HEAD', cwd);
  let activeBranch = headResult.stdout;
  if (headResult.error) {
    // Might be in detached HEAD state
    const detachedResult = await execPromise('git rev-parse --short HEAD', cwd);
    activeBranch = detachedResult.error ? 'Unknown' : `(HEAD detached at ${detachedResult.stdout})`;
  }

  // 2. Get branches (local and remote)
  const branchesResult = await execPromise('git branch -a --format="%(refname:short)|%(objectname:short)|%(upstream:track)"', cwd);
  let branches = [];
  if (!branchesResult.error && branchesResult.stdout) {
    branches = branchesResult.stdout.split('\n').map(line => {
      const [name, commitHash, tracking] = line.split('|');
      if (!name || name.includes('/HEAD') || name === 'HEAD') return null;
      
      const isRemote = name.startsWith('remotes/') || name.startsWith('origin/');
      const cleanName = name.replace(/^remotes\//, ''); // e.g. remotes/origin/main -> origin/main

      return {
        name: cleanName,
        commitHash,
        isActive: cleanName === activeBranch || name === activeBranch,
        isRemote
      };
    }).filter(Boolean);
  }

  // 3. Get status files
  const statusResult = await execPromise('git status --porcelain', cwd);
  let files = [];
  if (!statusResult.error && statusResult.stdout) {
    files = statusResult.stdout.split('\n').filter(Boolean).map(line => {
      const code = line.slice(0, 2);
      const filePath = line.slice(3);
      
      let type = 'modified';
      if (code.includes('A') || code.includes('?')) type = 'untracked';
      else if (code.includes('D')) type = 'deleted';
      else if (code.includes('R')) type = 'renamed';

      const isStaged = code[0] !== ' ' && code[0] !== '?';

      return {
        path: filePath,
        code,
        type,
        isStaged
      };
    });
  }

  // 4. Get list of commits with full tree references
  // Format: hash | parents | author_name | author_email | unix_timestamp | subject | decoration
  const logFormat = '%H|%P|%an|%ae|%at|%s|%d';
  const logResult = await execPromise(`git log --all --pretty=format:"${logFormat}" -n 150`, cwd);
  
  let commits = [];
  if (!logResult.error && logResult.stdout) {
    commits = logResult.stdout.split('\n').filter(Boolean).map(line => {
      const [hash, parents, author, email, timestamp, subject, decoration] = line.split('|');
      
      // Parse decorations (e.g., "(HEAD -> master, origin/master)")
      let branchRefs = [];
      let isHead = false;
      if (decoration) {
        const cleanDec = decoration.trim().replace(/^\((.*)\)$/, '$1');
        const refs = cleanDec.split(', ');
        refs.forEach(ref => {
          let name = ref.trim();
          if (name.startsWith('HEAD -> ')) {
            isHead = true;
            name = name.replace('HEAD -> ', '');
          }
          if (name !== 'HEAD') {
            branchRefs.push(name);
          }
        });
      }

      return {
        hash: hash.substring(0, 8),
        fullHash: hash,
        parents: parents ? parents.split(' ').map(p => p.substring(0, 8)) : [],
        author,
        email,
        date: new Date(parseInt(timestamp) * 1000).toISOString(),
        message: subject,
        branches: branchRefs,
        isHead
      };
    });
  }

  return {
    isValid: true,
    repoPath: cwd,
    activeBranch,
    branches,
    files,
    commits
  };
}

// Get the git diff of unstaged/staged changes
export async function getDiff(repoPath, filePath = '', staged = false) {
  const verify = await verifyGitRepo(repoPath);
  if (!verify.isValid) return verify;

  const cwd = verify.resolvedPath;
  const cmd = `git diff ${staged ? '--cached' : ''} -- ${filePath ? `"${filePath}"` : ''}`;
  const diffResult = await execPromise(cmd, cwd);
  
  return {
    isValid: true,
    diff: diffResult.stdout || (diffResult.error ? '' : 'No changes.'),
    staged
  };
}

// Execute common git command safely
export async function executeGitCommand(repoPath, action, params = {}) {
  const verify = await verifyGitRepo(repoPath);
  if (!verify.isValid) return verify;

  const cwd = verify.resolvedPath;
  let command = '';

  switch (action) {
    case 'add':
      const file = params.file || '.';
      command = `git add "${file}"`;
      break;
    case 'commit':
      if (!params.message) return { error: 'Commit message is required' };
      // Escape double quotes in message
      const escapedMsg = params.message.replace(/"/g, '\\"');
      command = `git commit -m "${escapedMsg}"`;
      break;
    case 'checkout':
      if (!params.branch) return { error: 'Branch name is required' };
      command = `git checkout "${params.branch}"`;
      break;
    case 'create-branch':
      if (!params.branch) return { error: 'Branch name is required' };
      command = `git checkout -b "${params.branch}"`;
      break;
    case 'merge':
      if (!params.branch) return { error: 'Branch to merge is required' };
      command = `git merge "${params.branch}"`;
      break;
    case 'rebase':
      if (!params.branch) return { error: 'Branch to rebase onto is required' };
      command = `git rebase "${params.branch}"`;
      break;
    case 'reset-hard':
      command = 'git reset --hard HEAD';
      break;
    case 'raw':
      // Only allow safe raw commands to prevent destructive shell commands
      const rawCmd = params.command || '';
      if (!rawCmd.startsWith('git ')) return { error: 'Only git commands are allowed' };
      // Block arbitrary executions like semicolons or pipe operators
      if (/[;&|`]/.test(rawCmd)) return { error: 'Special characters are blocked for safety.' };
      command = rawCmd;
      break;
    default:
      return { error: 'Unsupported action' };
  }

  const result = await execPromise(command, cwd);
  return {
    success: !result.error,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
    commandRun: command
  };
}
