import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const prismaCommand = isWindows ? 'node_modules\\.bin\\prisma.cmd' : './node_modules/.bin/prisma';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const migrationAttempts = 3;

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let settled = false;

    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.once('error', (error) => finish({ code: 1, output: `${output}${error.message}` }));
    child.once('close', (code) => finish({ code: code ?? 1, output }));
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function applyMigrations() {
  // Preview deployments must never compete for the production database schema.
  if (process.env.VERCEL_ENV === 'preview') {
    console.log('[database] Skipping migrations for a Vercel preview deployment.');
    return true;
  }

  for (let attempt = 1; attempt <= migrationAttempts; attempt += 1) {
    console.log(`[database] Applying Prisma migrations (attempt ${attempt}/${migrationAttempts})...`);
    const result = await run(prismaCommand, ['migrate', 'deploy']);

    if (result.code === 0) {
      return true;
    }

    const advisoryLockTimedOut = /P1002|advisory lock/i.test(result.output);
    if (!advisoryLockTimedOut || attempt === migrationAttempts) {
      return false;
    }

    const delay = attempt * 15_000;
    console.warn(
      `[database] Another migration holds Prisma's advisory lock. Retrying in ${delay / 1000} seconds...`,
    );
    await wait(delay);
  }

  return false;
}

async function main() {
  if (!(await applyMigrations())) {
    process.exitCode = 1;
    return;
  }

  const build = await run(npmCommand, ['run', 'build']);
  process.exitCode = build.code;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
