// Executed inside the existing Router, whose /data/router is the original
// durable source. This exports data; it never reads an OAuth home.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = '/data/router';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const deadline = Date.now() + 15000;
const LIMIT = 256 * 1024 * 1024;
const budget = { bytes: LIMIT, files: 0 };
const denied = new Set(['auth.json', '.credentials.json', 'credentials.json',
  'oauth.json', 'oauth_creds.json', 'refresh-recovery']);
const destination = path.join(root, '.state-backups', randomUUID());
const manifest = {
  schema: 'link-assistant-router/data-backup/v1',
  signing_secret_sha256: digest(process.env.TOKEN_SECRET), files: {},
  excluded: ['OAuth homes and OS credential stores', 'refresh-recovery',
    'requests (append-only request logs, left in place)',
    'unregistered data paths', 'concurrent changes after each file/export']
};
function directory(name) {
  if (fs.existsSync(name) && fs.lstatSync(name).isSymbolicLink())
    throw Error(`checkpoint refuses a symlink at ${name}`);
  fs.mkdirSync(name, { recursive: true, mode: 0o700 });
}
// Every refusal names its reason and path (issue #658).
function charge(relative, length) {
  if (length > budget.bytes)
    throw Error(`checkpoint exceeds the ${LIMIT / 1048576} MiB budget at ${path.join(root, relative)} (${length} bytes, ${budget.bytes} bytes of budget left)`);
}
function save(relative, bytes) {
  if (Date.now() >= deadline)
    throw Error(`checkpoint exceeded its 15-second time budget at ${path.join(root, relative)}`);
  if (++budget.files > 10000)
    throw Error(`checkpoint exceeded its 10000-file budget at ${path.join(root, relative)}`);
  charge(relative, bytes.length);
  budget.bytes -= bytes.length;
  const file = path.join(destination, relative);
  directory(path.dirname(file));
  fs.writeFileSync(file, bytes, { mode: 0o600, flag: 'wx' });
  manifest.files[relative] = digest(bytes);
}
function copy(relative, depth = 0) {
  if (Date.now() >= deadline)
    throw Error(`checkpoint exceeded its 15-second time budget at ${path.join(root, relative)}`);
  if (depth > 32) throw Error(`checkpoint exceeded its 32-level depth budget at ${path.join(root, relative)}`);
  if (relative.split(path.sep).some(part => denied.has(part))) {
    manifest.excluded.push(relative); return;
  }
  const source = path.join(root, relative);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw Error(`checkpoint refuses a symlink in recoverable state at ${source}`);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(source)) copy(path.join(relative, entry), depth + 1);
  } else if (stat.isFile()) {
    charge(relative, stat.size);
    save(relative, fs.readFileSync(source));
  } else throw Error(`checkpoint refuses a special file at ${source}`);
}
// Request logs are append-only history capped by REQUEST_LOG_MAX_BYTES; they
// stay in place rather than being read into this budget (issue #658).
// No manifest is published for a partial checkpoint.
if (fs.lstatSync(root).isSymbolicLink()) throw Error(`checkpoint data root is a symlink at ${root}`);
directory(path.dirname(destination));
directory(destination);
const inventory = spawnSync('router', ['tokens', 'list', '--json'], {
  encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024
});
if (inventory.status !== 0) throw Error('checkpoint token inventory unavailable');
const records = JSON.parse(inventory.stdout);
if (!Array.isArray(records)) throw Error('checkpoint token inventory invalid');
save('tokens.json', Buffer.from(JSON.stringify(records)));
for (const relative of ['providers.lenv', 'projects', 'sessions']) {
  if (fs.existsSync(path.join(root, relative))) copy(relative);
}
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest), {
  mode: 0o600, flag: 'wx'
});
console.log(JSON.stringify({ schema: 'link-assistant-router/preservation/v1',
  status: 'data-checkpoint', checkpoint: destination, oauth_copied: false,
  global_atomic_snapshot: false }));
