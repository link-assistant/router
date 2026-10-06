#!/usr/bin/env node
/** Project-specific policy around the official operations package. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { Router, RouterError, version } from '../packages/javascript/index.js';
import { verifyContracts } from '../packages/javascript/testing.js';

const arguments_ = process.argv.slice(2);
if (arguments_.includes('--help')) {
  console.log('maintain-host.mjs <project-config.json> [--apply] [--verify]');
  process.exit(0);
}
const path = arguments_.find(argument => !argument.startsWith('--'));
if (!path) throw new Error('Provide the project configuration file');
const config = JSON.parse(await readFile(resolve(path), 'utf8'));
const root = resolve(config.root ?? join(homedir(), '.local/share/project-router'));
const repository = resolve(config.repository ?? process.cwd());
const deadlineMs = config.deadlineMs ?? 600_000;
const controller = new AbortController();
const stop = () => controller.abort();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const router = new Router({
  binary: process.env.ROUTER_BIN,
  deadlineMs,
  signal: controller.signal,
  // The package owns version checking and verified release downloads.
  allowVersionMismatch: false,
  env: {
    DATA_DIR: join(root, 'data'),
    // Supply these through the environment; no secret is a CLI option.
    ...(process.env.TOKEN_SECRET ? { TOKEN_SECRET: process.env.TOKEN_SECRET } : {}),
    ...(process.env.TOKEN_ADMIN_KEY ? { TOKEN_ADMIN_KEY: process.env.TOKEN_ADMIN_KEY } : {}),
  },
});
const deployment = {
  root,
  mode: 'host',
  image: `ghcr.io/link-assistant/router:${version}`,
  publicPort: config.port ?? 8080,
  installService: Boolean(config.installService),
  ...(config.deployConfig ? { config: resolve(config.deployConfig) } : {}),
};
const evidence = { packageVersion: version, root, started: new Date().toISOString() };
try {
  evidence.binary = (await router.version()).data;
  try {
    evidence.before = await router.deployStatus(deployment);
  } catch (error) {
    if (!(error instanceof RouterError) || error.code !== 'operation') throw error;
    // An absent deployment is expected on first use; retain the typed report.
    evidence.before = error.result;
  }
  if (arguments_.includes('--apply')) {
    evidence.applied = await router.deploy(deployment);
    evidence.after = await router.deployStatus(deployment);
  }
  if (arguments_.includes('--verify')) {
    evidence.verification = await verifyContracts({
      router,
      repository,
      linux: process.platform === 'darwin',
      clientVersions: 'installed',
      areas: config.areas ?? ['rolling-updates'],
      deadlineMs: 3_600_000,
      output: join(root, 'verification.json'),
    });
  }
  evidence.finished = new Date().toISOString();
  await mkdir(root, { recursive: true });
  await writeFile(join(root, 'maintenance.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
  console.log(`Router ${version} maintenance completed; evidence: ${join(root, 'maintenance.json')}`);
} catch (error) {
  // Diagnostics are typed; never dump environment values or issued tokens.
  if (error instanceof RouterError) {
    console.error(`Router ${error.code} failure (exit ${error.exitCode ?? 'unavailable'}): ${error.message}`);
  } else console.error(error.message);
  process.exitCode = 1;
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
