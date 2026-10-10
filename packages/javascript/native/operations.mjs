/** Native operation dispatcher. This module never resolves or spawns a Rust executable. */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';

export const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
export const version = catalog.version;
export const operationNames = Object.freeze(catalog.operations.map(operation => operation.name));
const camel = value => value.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
const snake = value => value.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()).replaceAll('-', '_');
const validators = new Map();
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, validateFormats: false });

export class NativeRouterError extends Error {
  constructor(message, { code = 'operation', result = null, cause } = {}) {
    super(message, { cause });
    this.name = 'NativeRouterError'; this.code = code; this.result = result;
    this.exitCode = result?.exit_code ?? null; this.stderr = result?.diagnostics.join('\n') ?? '';
  }
}
export function validateNativeResult(name, result) {
  if (!validators.has(name)) {
    const schema = JSON.parse(readFileSync(new URL(`../schemas/${name.replaceAll('.', '-')}.v1.json`, import.meta.url), 'utf8'));
    validators.set(name, ajv.compile(schema));
  }
  if (!validators.get(name)(result)) throw new NativeRouterError(`Invalid ${name} contract: ${ajv.errorsText(validators.get(name).errors)}`, { code: 'schema', result });
  return result;
}
export function operationResult(name, data, diagnostics = [], exitCode = 0) {
  return validateNativeResult(name, {
    schema: `link-assistant-router/${name.replaceAll('.', '-')}/v1`, operation: name,
    success: exitCode === 0, exit_code: exitCode, data, diagnostics,
  });
}
const output = (...lines) => ({ output: lines });
const unsupported = message => { throw new NativeRouterError(message, { code: 'unsupported' }); };
export const nativeOperationSupport = Object.freeze({
  version: 'implemented', contracts: 'implemented',
  'accounts.list': 'partial', 'accounts.pause': 'partial', 'accounts.resume': 'partial', 'accounts.policy': 'partial',
  'tokens.issue': 'partial', 'tokens.list': 'partial', 'tokens.show': 'partial', 'tokens.revoke': 'partial',
  'tokens.import': 'partial', 'tokens.expire': 'partial', 'tokens.rotate': 'partial', 'tokens.recover-admin': 'partial',
  'providers.list': 'partial', 'providers.show': 'partial', 'providers.add': 'partial', 'providers.remove': 'partial',
  'providers.import': 'partial', 'models.explain': 'partial', serve: 'partial', doctor: 'partial', 'auth.status': 'partial',
});
function normalizeOptions(operation, options) {
  const allowed = new Map(operation.options.map(option => [snake(option.name), option]));
  const normalized = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    const name = snake(key), option = allowed.get(name);
    if (!option) throw new NativeRouterError(`Unknown ${operation.name} option: ${key}`, { code: 'options' });
    if (option.secret) throw new NativeRouterError(`${key} is secret; use invocation env or stdin`, { code: 'secret-argv' });
    if (option.boolean && typeof value !== 'boolean') throw new NativeRouterError(`${key} must be boolean`, { code: 'options' });
    normalized[name] = value;
  }
  for (const option of operation.options) if (option.required && normalized[option.name] === undefined)
    throw new NativeRouterError(`Missing ${operation.name} option: ${camel(option.name)}`, { code: 'options' });
  return normalized;
}
function localOnly(options, accepted = []) {
  const consumed = new Set(['local', ...accepted]);
  for (const [name, value] of Object.entries(options)) {
    if (value === false) continue;
    if (!consumed.has(name)) unsupported(`Native local operation does not support ${name}; configure the native runtime explicitly or use the Rust wrapper`);
  }
}
function redactedProvider(provider) {
  return {
    name: provider.name, kind: provider.kind ?? 'openai-compatible', base_url: provider.base_url,
    models: provider.models ?? [], supported_clients: provider.supported_clients ?? [],
    has_encrypted_api_key: Boolean(provider.has_encrypted_api_key ?? provider.api_key),
    enabled: provider.enabled !== false, intermediary_risk_acknowledged: Boolean(provider.intermediary_risk_acknowledged),
    unsupported_clients: provider.unsupported_clients ?? [],
    ...Object.fromEntries(['api_key_env', 'default_model', 'subscriber_id'].filter(key => provider[key] !== undefined).map(key => [key, provider[key]])),
  };
}
function tokenOptions(options) {
  const result = {};
  for (const key of ['ttl_hours', 'max_requests', 'max_tokens', 'rate_limit_per_minute']) {
    if (options[key] === undefined) continue;
    const number = Number(options[key]);
    if (!Number.isSafeInteger(number) || number < 0 || (key === 'ttl_hours' && number === 0))
      throw new NativeRouterError(`${key} must be a positive safe integer (limits may be zero)`, { code: 'options' });
    result[key] = number;
  }
  for (const key of ['label', 'account']) if (options[key] !== undefined) result[key] = options[key];
  if (options.admin) result.scope = 'admin';
  if (options.github_repo) result.github_repos = Array.isArray(options.github_repo) ? options.github_repo : [options.github_repo];
  if (options.allowed_model) result.model_policy = { allowed_models: Array.isArray(options.allowed_model) ? options.allowed_model : [options.allowed_model] };
  return result;
}
const find = (records, key, value) => {
  const record = records.find(record => record[key] === value);
  if (!record) throw new NativeRouterError(`Unknown ${key}: ${value}`, { code: 'not-found' });
  return record;
};
async function runtimeFor(router) {
  router.corePromise ??= router.options.core ? Promise.resolve(router.options.core)
    : import('./core.mjs').then(({ createRouterCore }) => createRouterCore(router.options));
  return router.corePromise;
}
async function dispatch(router, name, options, invocation) {
  if (name === 'version') { localOnly(options); return { version, source_commit: 'unknown' }; }
  if (name === 'contracts') { localOnly(options); return catalog; }
  if (!nativeOperationSupport[name]) unsupported(`Native operation ${name} is not implemented in this draft; use the explicit Rust Router wrapper`);
  const core = await runtimeFor(router);
  if (name === 'accounts.list') {
    localOnly(options); return { accounts: (await core.accounts.list()).map(account => ({
      name: account.name, healthy: account.healthy ?? !account.paused,
      paused: Boolean(account.limits?.pause && (account.limits.pause.until_unix == null || account.limits.pause.until_unix > core.clock())),
      ...(account.policy ? { routing_policy: account.policy } : {}),
      ...(account.limits?.pause ? { pause: account.limits.pause } : {}),
    })) };
  }
  if (name === 'accounts.pause') {
    localOnly(options, ['name', 'reason', 'until']);
    let until;
    if (options.until !== undefined) {
      until = Number(options.until);
      if (!Number.isFinite(until)) until = Date.parse(options.until) / 1000;
      if (!Number.isFinite(until)) throw new NativeRouterError('until must be Unix seconds or an ISO timestamp', { code: 'options' });
    }
    await core.accounts.pause(options.name, { reason: options.reason, until_unix: until });
    return output(`Paused account ${options.name}`);
  }
  if (name === 'accounts.resume') {
    localOnly(options, ['name']); await core.accounts.resume(options.name); return output(`Resumed account ${options.name}`);
  }
  if (name === 'accounts.policy') {
    localOnly(options, ['name', 'file']);
    if (options.file) {
      const policy = JSON.parse(await readFile(options.file, 'utf8'));
      // The canonical result schema validates policy before any state change.
      operationResult(name, policy);
      await core.accounts.policy(options.name, policy);
    }
    const account = find(await core.accounts.list(), 'name', options.name);
    return account.policy ?? account.routing_policy ?? {};
  }
  if (name.startsWith('tokens.')) {
    const tokens = core.tokens;
    if (name === 'tokens.import') {
      localOnly(options, ['from', 'ids', 'dry_run']);
      if (!options.from.endsWith('.json')) unsupported('Native token import supports JSON token export files only; binary, lino and deployment directory imports remain incomplete');
      const source = JSON.parse(await readFile(options.from, 'utf8'));
      if (!Array.isArray(source)) throw new NativeRouterError('Token export must be an array', { code: 'options' });
      const ids = new Set();
      for (const record of source) {
        operationResult('tokens.show', record);
        if (ids.has(record.id)) throw new NativeRouterError('Duplicate imported token id', { code: 'options' });
        ids.add(record.id);
      }
      const wanted = options.ids ? (Array.isArray(options.ids) ? options.ids : [options.ids]) : [];
      const report = { mode: 'merge-missing', dry_run: options.dry_run ?? false, source_records: source.length,
        target_records_before: 0, added: [], unchanged: [], conflicts: [], replaced: [], kept_revoked: [],
        missing_from_source: wanted.filter(id => !ids.has(id)).sort() };
      const apply = records => {
        report.target_records_before = records.size;
        for (const incoming of source.slice().sort((a,b) => a.id.localeCompare(b.id))) {
          if (wanted.length && !wanted.includes(incoming.id)) continue;
          const existing = records.get(incoming.id);
          if (!existing) { report.added.push(incoming.id); if (!options.dry_run) records.set(incoming.id, structuredClone(incoming)); }
          else {
            const fields = [...new Set([...Object.keys(existing), ...Object.keys(incoming)])].filter(key => JSON.stringify(existing[key]) !== JSON.stringify(incoming[key])).sort();
            if (fields.length) report.conflicts.push({ id: incoming.id, fields }); else report.unchanged.push(incoming.id);
          }
        }
      };
      if (options.dry_run) apply(new Map((await tokens.list()).map(record => [record.id, record])));
      else await tokens.store.transaction(apply);
      if (report.conflicts.length || report.missing_from_source.length) {
        const error = new NativeRouterError('Token import has unresolved conflicts or missing requested IDs', { code: 'import-conflict' });
        error.data = report; error.exitCode = 2; throw error;
      }
      return report;
    }
    if (name === 'tokens.list') { localOnly(options); return await tokens.list(); }
    if (name === 'tokens.show') { localOnly(options, ['id']); return find(await tokens.list(), 'id', options.id); }
    if (['tokens.revoke', 'tokens.expire'].includes(name)) {
      localOnly(options, ['id']); find(await tokens.list(), 'id', options.id);
      await tokens[name.split('.')[1]](options.id); return output(`${name.split('.')[1]}: ${options.id}`);
    }
    const allowed = ['ttl_hours', 'label', 'account', 'max_requests', 'max_tokens', 'rate_limit_per_minute', 'admin', 'github_repo', 'allowed_model'];
    if (name === 'tokens.issue') {
      localOnly(options, allowed);
      const issued = await tokens.issue(tokenOptions(options)); return { token: issued.token };
    }
    if (name === 'tokens.rotate') {
      localOnly(options, ['id', ...allowed]); find(await tokens.list(), 'id', options.id);
      const issued = await tokens.rotate(options.id, tokenOptions(options)); return { token: issued.token };
    }
    if (name === 'tokens.recover-admin') {
      localOnly(options, ['ttl_hours', 'label', 'revoke_others']);
      const admins = (await tokens.list()).filter(record => record.scope === 'admin' && !record.revoked);
      const issued = await tokens.issue(tokenOptions({ ttl_hours: options.ttl_hours, label: options.label ?? 'recovered-admin', admin: true }));
      const revoked = [];
      if (options.revoke_others) for (const record of admins) { await tokens.revoke(record.id); revoked.push(record.id); }
      return { recovered: true, token: issued.token, token_id: issued.id, retained_admins: options.revoke_others ? 0 : admins.length, revoked };
    }
  }
  if (name.startsWith('providers.')) {
    const providers = core.providers;
    if (name === 'providers.list') { localOnly(options); return (await providers.list()).map(redactedProvider); }
    if (name === 'providers.show') { localOnly(options, ['name']); return redactedProvider(find(await providers.list(), 'name', options.name)); }
    if (name === 'providers.remove') {
      localOnly(options, ['name']); find(await providers.list(), 'name', options.name); await providers.remove(options.name); return output(`Removed provider ${options.name}`);
    }
    if (name === 'providers.add') {
      localOnly(options, ['name', 'kind', 'base_url', 'model', 'models', 'supported_clients', 'api_key_env', 'api_key_stdin', 'enabled', 'if_absent']);
      if (options.kind && options.kind !== 'openai-compatible') unsupported('Native provider provisioning currently supports openai-compatible only; specialized provider validation is incomplete');
      const existing = (await providers.list()).find(provider => provider.name === options.name);
      if (existing && options.if_absent) return { ...redactedProvider(existing), outcome: 'already_present' };
      const models = Array.isArray(options.models) ? options.models : options.models ? [options.models] : options.model ? [options.model] : [];
      const apiKey = options.api_key_stdin ? String(invocation.stdin ?? '').trim() : undefined;
      if (options.api_key_stdin && !apiKey) throw new NativeRouterError('api-key-stdin requires nonempty stdin', { code: 'options' });
      const provider = { name: options.name, kind: 'openai-compatible', base_url: options.base_url, models,
        default_model: options.model ?? models[0], supported_clients: options.supported_clients ?? [],
        api_key_env: options.api_key_env, ...(apiKey ? { api_key: apiKey } : {}), enabled: options.enabled ?? true };
      if (core.upsertProvider) await core.upsertProvider(provider); else await providers.upsert(provider);
      return { ...redactedProvider(provider), outcome: existing ? 'replaced' : 'created' };
    }
    if (name === 'providers.import') {
      localOnly(options, ['path']);
      const imported = JSON.parse(await readFile(options.path, 'utf8'));
      const records = Array.isArray(imported) ? imported : imported.providers;
      if (!Array.isArray(records)) throw new NativeRouterError('Import requires an array or {providers: []}', { code: 'options' });
      // Validate the entire input before writing any record.
      for (const record of records) {
        if (record.kind && record.kind !== 'openai-compatible') unsupported('Import of specialized provider kinds is incomplete');
        if (typeof record.name !== 'string' || !record.name || !['http:', 'https:'].includes(new URL(record.base_url).protocol))
          throw new NativeRouterError('Invalid imported provider', { code: 'options' });
      }
      for (const record of records) { if (core.upsertProvider) await core.upsertProvider(record); else await providers.upsert(record); }
      return output(`Imported ${records.length} providers`);
    }
  }
  if (name === 'serve') {
    localOnly(options, ['host', 'port']);
    const port = options.port === undefined ? undefined : Number(options.port);
    if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) throw new NativeRouterError('port must be in 0..65535', { code: 'options' });
    const server = await router.listen({ host: options.host, port });
    return output('Native server is listening');
  }
  if (name === 'models.explain') {
    localOnly(options, ['id', 'client']);
    const candidates = await core.candidates({ model: options.id });
    const model = (await core.models()).find(model => model.id === options.id);
    const healthy = [...new Set(candidates.map(candidate => candidate.provider?.name ?? candidate.provider).filter(name => typeof name === 'string'))];
    const route = { protocols: ['openai-chat'], ...(model?.provider ? { provider: model.provider } : {}) };
    return { contract_version: 1, requested_selector: options.id, selector_kind: 'exact',
      model_descriptor: { selector_kind: 'exact', requested_selector: options.id, route, capabilities: {},
        capability_provenance: { source: 'native-config', verified: false }, allow_substitution: false },
      client_representation: { client: options.client ?? 'generic', advertisements: [] }, route_scope: route,
      capability_provenance: { source: 'native-config', verified: false }, model_policy: { allow_substitution: false },
      health: { healthy_providers: healthy, starting_providers: [], degraded_providers: [], degraded_reasons: {} },
      routing: { state: candidates.length ? 'available' : 'unavailable', candidate_count: candidates.length, catalog_conflicts: [] },
      output: ['Native local candidate inspection; live catalog capabilities and client advertisements are not implemented'] };
  }
  if (name === 'auth.status') {
    localOnly(options);
    return { credentials: [], sources: [], api_key_providers: (await core.providers.list()).map(redactedProvider),
      output: ['Native draft inspects configured API-key providers; subscription OAuth credential discovery is not implemented'] };
  }
  if (name === 'doctor') {
    localOnly(options);
    const config = core.config ?? router.options.config ?? {};
    return { status: 'partial', version, checks: [{ name: 'native-runtime', state: 'ok' }, { name: 'subscription-auth', state: 'unverified', detail: 'OAuth discovery and provider verification are not implemented' }],
      providers: [], deployments: [], recommended_models: [], data_dir: config.data_dir ?? '',
      listen_addr: `${config.host ?? '127.0.0.1'}:${config.port ?? 3000}`, forwarded_headers: [],
      output: ['Native configuration loaded; provider connectivity and host deployment checks remain unimplemented'] };
  }
  unsupported(`Native operation ${name} is not implemented`);
}

/** Operation namespaces plus the native HTTP runtime. The Rust wrapper remains separate. */
export class NativeRouter {
  constructor(options = {}) {
    this.options = options; this.corePromise = null; this.serverPromise = null;
    for (const operation of catalog.operations) {
      let namespace = this;
      const names = operation.name.split('.').map(camel);
      for (const name of names.slice(0, -1)) namespace = namespace[name] ??= {};
      namespace[names.at(-1)] = (options = {}, invocation = {}) => this.invoke(operation.name, options, invocation);
    }
    this.deployStatus = (options = {}, invocation = {}) => this.deploy({ ...options, status: true }, invocation);
    this.logs = Object.assign((options = {}, invocation = {}) => this.invoke('logs.show', options, invocation), this.logs);
    const launch = this.with;
    this.with = (client, args, options = {}, invocation = {}) => typeof client === 'string'
      ? launch({ ...options, client, clientArgs: args }, invocation) : launch(client, args);
  }
  async execute(name, options = {}, invocation = {}) {
    const operation = catalog.operations.find(operation => operation.name === name);
    if (!operation) return operationResult('cli-error', output(), [`Unknown operation: ${name}`], 2);
    try {
      for (const key of ['env', 'cwd', 'deadlineMs', 'maxOutputBytes']) if (invocation[key] !== undefined) unsupported(`Native per-invocation ${key} is not implemented; configure the runtime at construction`);
      if (invocation.signal?.aborted) throw new NativeRouterError('Operation cancelled', { code: 'cancelled' });
      const normalized = normalizeOptions(operation, options);
      const data = await dispatch(this, name, normalized, invocation);
      return operationResult(name, data);
    } catch (error) {
      return operationResult(name, error.data ?? output(), [`${error.code ?? 'operation'}: ${error.message}`], error.exitCode ?? (error.code === 'options' || error.code === 'secret-argv' ? 2 : 1));
    }
  }
  async invoke(name, options = {}, invocation = {}) {
    const result = await this.execute(name, options, invocation);
    if (!result.success) throw new NativeRouterError(result.diagnostics.join('; '), { result,
      code: result.diagnostics[0]?.split(':')[0] ?? 'operation' });
    return result;
  }
  async runtime() {
    this.serverPromise ??= Promise.all([runtimeFor(this), import('./server.mjs')]).then(([core, { createNativeRouter }]) => createNativeRouter({ ...this.options, core }));
    return this.serverPromise;
  }
  async fetch(request) { return (await this.runtime()).fetch(request); }
  async listen(options) { return (await this.runtime()).listen(options); }
  async close() { if (this.serverPromise) await (await this.serverPromise).close(); }
}
export const createNativeRouter = options => new NativeRouter(options);
