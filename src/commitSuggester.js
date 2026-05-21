// Commit Message Suggester Engine
// Translates user prompts (ID/EN) and file diffs into highly professional commit messages

// 1. Dictionaries and Rule Maps for Translation & Categorization
const RULES = {
  types: [
    {
      key: 'feat',
      emoji: '✨',
      gitmoji: ':sparkles:',
      terms: ['tambah', 'bikin', 'buat', 'add', 'create', 'implement', 'new', 'baru', 'halaman', 'page', 'feature', 'fitur', 'integrasi', 'integrate'],
      desc: 'A new feature'
    },
    {
      key: 'fix',
      emoji: '🐛',
      gitmoji: ':bug:',
      terms: ['benerin', 'perbaiki', 'fix', 'error', 'bug', 'crash', 'salah', 'resolv', 'correct', 'handling', 'gagal', 'fail', 'issues', 'masalah', 'patch'],
      desc: 'A bug fix'
    },
    {
      key: 'docs',
      emoji: '📝',
      gitmoji: ':memo:',
      terms: ['dokumen', 'docs', 'readme', 'tulis', 'catatan', 'comment', 'komentar', 'writeup', 'panduan', 'guide'],
      desc: 'Documentation only changes'
    },
    {
      key: 'style',
      emoji: '💄',
      gitmoji: ':lipstick:',
      terms: ['style', 'css', 'warna', 'layout', 'font', 'tampilan', 'design', 'margin', 'padding', 'aesthetic', 'tema', 'theme', 'styling'],
      desc: 'Changes that do not affect the meaning of the code (white-space, formatting, etc)'
    },
    {
      key: 'refactor',
      emoji: '♻️',
      gitmoji: ':recycle:',
      terms: ['refactor', 'struktur', 'rapikan', 'clean', 'pindah', 'move', 'organize', 'cleanup', 'ganti', 'replace', 'simplify', 'sederhana'],
      desc: 'A code change that neither fixes a bug nor adds a feature'
    },
    {
      key: 'perf',
      emoji: '⚡',
      gitmoji: ':zap:',
      terms: ['cepat', 'perf', 'optim', 'speed', 'slow', 'lambat', 'memory', 'leak', 'cache', 'compress'],
      desc: 'A code change that improves performance'
    },
    {
      key: 'test',
      emoji: '🧪',
      gitmoji: ':test_tube:',
      terms: ['test', 'uji', 'mock', 'unit', 'e2e', 'cypress', 'jest', 'coverage', 'assert'],
      desc: 'Adding missing tests or correcting existing tests'
    },
    {
      key: 'chore',
      emoji: '🔧',
      gitmoji: ':wrench:',
      terms: ['config', 'build', 'npm', 'package', 'install', 'dep', 'setup', 'ignore', 'eslint', 'vite', 'setting', 'konfigurasi'],
      desc: 'Changes to the build process or auxiliary tools and libraries'
    }
  ],
  
  scopes: [
    { key: 'auth', terms: ['login', 'register', 'masuk', 'daftar', 'token', 'jwt', 'session', 'auth', 'oauth', 'password', 'sandi', 'logout', 'keluar'] },
    { key: 'ui', terms: ['sidebar', 'navbar', 'modal', 'popup', 'button', 'tombol', 'card', 'table', 'tabel', 'menu', 'layout', 'canvas', 'graph', 'chart', 'grid', 'flex'] },
    { key: 'api', terms: ['api', 'fetch', 'axios', 'endpoint', 'request', 'response', 'payload', 'backend', 'server', 'query', 'graphql', 'http'] },
    { key: 'db', terms: ['db', 'database', 'sql', 'prisma', 'schema', 'tabel', 'migrasi', 'migration', 'seed', 'model', 'query'] },
    { key: 'core', terms: ['main', 'app', 'index', 'router', 'state', 'context', 'redux', 'store', 'provider', 'config', 'setup'] },
    { key: 'deps', terms: ['package', 'npm', 'yarn', 'dependency', 'install', 'update', 'upgrade', 'version', 'versi'] }
  ]
};

// Translate common Indonesian developer verbs/nouns to professional English terms
const ID_EN_TRANSLATIONS = {
  'tambah': 'add',
  'tambahkan': 'add',
  'membuat': 'create',
  'bikin': 'create',
  'buat': 'create',
  'menambahkan': 'add',
  'mengimplementasikan': 'implement',
  'benerin': 'fix',
  'memperbaiki': 'fix',
  'mengoreksi': 'correct',
  'menyelesaikan': 'resolve',
  'hapus': 'remove',
  'menghapus': 'remove',
  'ganti': 'update',
  'mengganti': 'update',
  'ubah': 'update',
  'mengubah': 'modify',
  'sesuaikan': 'adjust',
  'menyesuaikan': 'adjust',
  'rapihin': 'refactor',
  'rapikan': 'refactor',
  'merapikan': 'clean up',
  'bikin baru': 'create new',
  'masalah': 'issue',
  'error': 'error',
  'salah': 'incorrect',
  'tampilan': 'ui',
  'halaman': 'page',
  'tombol': 'button',
  'ke': 'to',
  'dengan': 'with',
  'pada': 'on',
  'di': 'at',
  'dari': 'from',
  'dan': 'and',
  'untuk': 'for'
};

// 2. Main Suggestion Generator
export function generateCommitSuggestions(prompt, diffText = '') {
  let cleanPrompt = prompt ? prompt.trim() : '';
  let detectedType = 'feat'; // default
  let detectedScope = '';
  let summary = '';
  let bulletPoints = [];

  // If a diff is provided but prompt is empty, analyze diff to make a prompt!
  if (!cleanPrompt && diffText) {
    const diffAnalysis = analyzeDiff(diffText);
    cleanPrompt = diffAnalysis.suggestedPrompt;
    detectedType = diffAnalysis.type;
    detectedScope = diffAnalysis.scope;
    summary = diffAnalysis.summary;
    bulletPoints = diffAnalysis.bulletPoints;
  }

  if (!cleanPrompt) {
    return [];
  }

  // Parse prompt for type and scope if we didn't get them from diff
  if (bulletPoints.length === 0) {
    const lowerPrompt = cleanPrompt.toLowerCase();
    
    // Type detection
    let maxMatchesType = -1;
    RULES.types.forEach(t => {
      const matches = t.terms.filter(term => lowerPrompt.includes(term)).length;
      if (matches > maxMatchesType && matches > 0) {
        maxMatchesType = matches;
        detectedType = t.key;
      }
    });

    // Scope detection
    let maxMatchesScope = -1;
    RULES.scopes.forEach(s => {
      const matches = s.terms.filter(term => lowerPrompt.includes(term)).length;
      if (matches > maxMatchesScope && matches > 0) {
        maxMatchesScope = matches;
        detectedScope = s.key;
      }
    });

    // Translate/Transform the cleanPrompt to professional English summary
    summary = translateAndFormat(cleanPrompt);
  }

  const typeObj = RULES.types.find(t => t.key === detectedType) || RULES.types[0];
  const scopeStr = detectedScope ? `(${detectedScope})` : '';

  // Construct Suggestions
  const suggestions = [];

  // Style 1: Conventional Commit
  const convTitle = `${detectedType}${scopeStr}: ${summary}`;
  suggestions.push({
    id: 'conventional',
    label: 'Conventional Commit',
    description: 'The industry standard structured format.',
    message: convTitle,
    type: detectedType,
    scope: detectedScope
  });

  // Style 2: Gitmoji / Colorful Commit
  const gitmojiTitle = `${typeObj.emoji} ${detectedType}${scopeStr}: ${summary}`;
  suggestions.push({
    id: 'gitmoji',
    label: 'Gitmoji Commit',
    description: 'Perfect for visual developer dashboards and GitHub.',
    message: gitmojiTitle,
    type: detectedType,
    scope: detectedScope
  });

  // Style 3: Minimalist / Casual
  // Capitalize first letter of summary, remove type/scope prefixes
  const casualTitle = summary.charAt(0).toUpperCase() + summary.slice(1);
  suggestions.push({
    id: 'casual',
    label: 'Casual / Git Style',
    description: 'Clean, imperative mood message.',
    message: casualTitle,
    type: detectedType,
    scope: detectedScope
  });

  // Style 4: Detailed Body Commit
  // Standard title + bullet points
  const detailedTitle = `${detectedType}${scopeStr}: ${summary}`;
  let finalBullets = bulletPoints;
  if (finalBullets.length === 0) {
    // Generate default bullets based on translating segments
    finalBullets = [
      `Implement changes described in: "${cleanPrompt}"`,
      `Adjust related modules for ${detectedScope || 'general components'}`
    ];
  }
  const detailedBody = `${detailedTitle}\n\n${finalBullets.map(pt => `- ${pt}`).join('\n')}`;
  suggestions.push({
    id: 'detailed',
    label: 'Detailed Body Commit',
    description: 'Includes structural bullet-point details, ideal for pull requests.',
    message: detailedBody,
    type: detectedType,
    scope: detectedScope
  });

  return suggestions;
}

// Helper: Translate and format a raw prompt
function translateAndFormat(promptText) {
  let text = promptText.toLowerCase();
  
  // Replace phrases/words
  Object.keys(ID_EN_TRANSLATIONS).forEach(idWord => {
    const enWord = ID_EN_TRANSLATIONS[idWord];
    // Use word boundaries or simple replace for common connectors
    const regex = new RegExp(`\\b${idWord}\\b`, 'g');
    text = text.replace(regex, enWord);
  });

  // Remove redundant type prefixes if they were written in Indonesian, e.g., "feat:", "bug:"
  text = text.replace(/^(feat|fix|bug|style|docs|refactor|perf|chore|test)\s*:\s*/i, '');
  text = text.replace(/^(add|create|implement|fix|update|remove|clean up)\b/i, (match) => match.toLowerCase());

  // Clean up excessive spaces
  text = text.trim().replace(/\s+/g, ' ');

  // Standardize imperative mood for commit titles (e.g. "adding" -> "add", "fixes" -> "fix")
  text = text.replace(/\badding\b/g, 'add')
             .replace(/\bcreating\b/g, 'create')
             .replace(/\bfixing\b/g, 'fix')
             .replace(/\bupdating\b/g, 'update')
             .replace(/\bdeleting\b/g, 'delete')
             .replace(/\bremoving\b/g, 'remove')
             .replace(/\brefactoring\b/g, 'refactor')
             .replace(/\bsebagai\b/g, 'as')
             .replace(/\byang\b/g, 'that');

  // Enforce limit of 50-70 characters for subject line
  if (text.length > 60) {
    text = text.substring(0, 57) + '...';
  }

  return text || 'update repository files';
}

// 3. Diff Analyzer (Extracting context from code diffs!)
export function analyzeDiff(diffText) {
  if (!diffText || diffText.trim() === 'No changes.') {
    return {
      suggestedPrompt: 'update repository files',
      type: 'chore',
      scope: 'core',
      summary: 'update repository files',
      bulletPoints: ['General housekeeping and configuration updates']
    };
  }

  const lines = diffText.split('\n');
  const changedFiles = [];
  let addedLinesCount = 0;
  let deletedLinesCount = 0;
  let codeSnippetAdditions = [];

  // Parse lines to detect files and basic edits
  lines.forEach(line => {
    if (line.startsWith('diff --git ')) {
      // e.g. "diff --git a/src/App.jsx b/src/App.jsx"
      const parts = line.split(' ');
      if (parts.length >= 4) {
        const filePath = parts[3].replace(/^b\//, '');
        changedFiles.push(filePath);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLinesCount++;
      const code = line.substring(1).trim();
      if (code && code.length > 5 && codeSnippetAdditions.length < 5) {
        codeSnippetAdditions.push(code);
      }
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletedLinesCount++;
    }
  });

  // Determine Type based on changed files and contents
  let type = 'refactor';
  let scope = 'core';

  if (changedFiles.length > 0) {
    const mainFile = changedFiles[0];
    const extension = mainFile.split('.').pop() || '';
    
    // Check main file path
    if (mainFile.includes('package.json') || mainFile.includes('vite.config') || mainFile.includes('.gitignore')) {
      type = 'chore';
      scope = 'deps';
    } else if (mainFile.endsWith('.md') || mainFile.includes('docs/')) {
      type = 'docs';
      scope = 'docs';
    } else if (mainFile.endsWith('.css') || mainFile.includes('styles/') || mainFile.includes('theme')) {
      type = 'style';
      scope = 'ui';
    } else if (mainFile.includes('test') || mainFile.includes('spec') || mainFile.includes('__tests__')) {
      type = 'test';
      scope = 'ui';
    } else {
      // Check content of additions for keywords
      const jointAdditions = codeSnippetAdditions.join(' ').toLowerCase();
      
      let matchedType = '';
      let maxMatchesType = 0;
      RULES.types.forEach(t => {
        const matches = t.terms.filter(term => jointAdditions.includes(term)).length;
        if (matches > maxMatchesType) {
          maxMatchesType = matches;
          matchedType = t.key;
        }
      });
      if (matchedType) type = matchedType;

      // Check scopes
      let matchedScope = '';
      let maxMatchesScope = 0;
      RULES.scopes.forEach(s => {
        const matches = s.terms.filter(term => {
          return mainFile.toLowerCase().includes(term) || jointAdditions.includes(term);
        }).length;
        if (matches > maxMatchesScope) {
          maxMatchesScope = matches;
          matchedScope = s.key;
        }
      });
      if (matchedScope) scope = matchedScope;
    }
  }

  // Create highly customized bullet points
  const bulletPoints = [];
  changedFiles.forEach((file, index) => {
    if (index < 3) {
      const fileName = file.split('/').pop() || file;
      bulletPoints.push(`Modify codebase structure in \`${fileName}\``);
    }
  });
  
  if (addedLinesCount > 0) {
    bulletPoints.push(`Implement ${addedLinesCount} line${addedLinesCount > 1 ? 's' : ''} of structural changes`);
  }
  if (deletedLinesCount > 0) {
    bulletPoints.push(`Remove or optimize ${deletedLinesCount} legacy line${deletedLinesCount > 1 ? 's' : ''}`);
  }

  // Suggest a nice summary based on type and main files
  const firstFileName = changedFiles.length > 0 ? changedFiles[0].split('/').pop() : 'files';
  const fileBaseName = firstFileName ? firstFileName.split('.')[0] : 'module';
  
  let summary = '';
  switch (type) {
    case 'feat':
      summary = `implement new updates in ${fileBaseName}`;
      break;
    case 'fix':
      summary = `resolve bugs and errors in ${fileBaseName}`;
      break;
    case 'docs':
      summary = `update documentation files for ${fileBaseName}`;
      break;
    case 'style':
      summary = `improve design and layout of ${fileBaseName}`;
      break;
    case 'refactor':
      summary = `refactor and clean up ${fileBaseName} logic`;
      break;
    case 'perf':
      summary = `enhance execution performance of ${fileBaseName}`;
      break;
    case 'test':
      summary = `add automated test suites for ${fileBaseName}`;
      break;
    case 'chore':
      summary = `update workspace build config and dependencies`;
      break;
    default:
      summary = `update repository development files`;
  }

  const suggestedPrompt = `${type} in ${fileBaseName}: ${summary}`;

  return {
    suggestedPrompt,
    type,
    scope,
    summary,
    bulletPoints
  };
}
