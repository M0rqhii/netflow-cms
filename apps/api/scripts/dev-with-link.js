const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(apiRoot, '..', '..');

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

function ensureLink(target, linkPath) {
  if (fs.existsSync(linkPath)) {
    return true;
  }
  try {
    fs.linkSync(target, linkPath);
    return true;
  } catch {
    try {
      fs.copyFileSync(target, linkPath);
      return true;
    } catch {
      return false;
    }
  }
}

function createLink() {
  const dist = path.join(apiRoot, 'dist');
  const linkPath = path.join(dist, 'main.js');
  const oldTarget = path.join(dist, 'apps', 'api', 'src', 'main.js');
  const newTarget = path.join(dist, 'src', 'main.js');

  if (fs.existsSync(oldTarget)) {
    return ensureLink(oldTarget, linkPath);
  }
  if (fs.existsSync(newTarget)) {
    return ensureLink(newTarget, linkPath);
  }
  return false;
}

(async () => {
  // Best-effort schema build
  await run('pnpm', ['--dir', repoRoot, '--filter', 'schemas', 'build']);

  // Build once to create dist
  await run('pnpm', ['-C', apiRoot, 'exec', 'nest', 'build'], {
    env: { ...process.env, NODE_OPTIONS: '-r tsconfig-paths/register' },
  });

  createLink();

  const child = spawn('pnpm', ['-C', apiRoot, 'exec', 'nest', 'start', '--watch'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_OPTIONS: '-r tsconfig-paths/register' },
  });

  const interval = setInterval(() => {
    createLink();
  }, 2000);

  child.on('exit', (code) => {
    clearInterval(interval);
    process.exit(code ?? 0);
  });
})();
