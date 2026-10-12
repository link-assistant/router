import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { transactionalWrite, recoverTransactionalWrite, encodeLino, serialized } from './storage.mjs';
import { rustLockPath, withAdvisoryFileLock } from './file-lock.mjs';
import { RouterError } from './tokens.mjs';
import { decodeAffinityFile, validateAffinityValue, exactInteger, integerABI, affinityExpiry, U64_MAX } from './affinity-schema.mjs';

const resourceNames = {responses:'responses','chat/completions':'chat',conversations:'conversations',
  'conversations/items':'conversation_items','realtime/calls':'realtime_calls',files:'files',
  'messages/batches':'batches',skills:'skills','skills/versions':'skill_versions',
  'mcp/sessions':'mcp_sessions','plugins/installs':'plugin_installs','plugins/uploads':'plugin_uploads',
  'workspace/plugins':'workspace_plugins'};
export function affinityNamespace(namespace) {
  if (typeof namespace !== 'string' || !namespace) throw new RouterError('invalid_argument','Resource namespace is required');
  const codexBackend = /^\/api\/services\/codex\/backend-api\/(plugin-uploads|plugin-installs|public\/plugins\/workspace)$/.exec(namespace);
  if (codexBackend) return { 'plugin-uploads':'codex_plugin_uploads','plugin-installs':'codex_plugin_installs','public/plugins/workspace':'codex_workspace_plugins' }[codexBackend[1]];
  const match = /^\/api\/services\/(openai|anthropic|codex|qwen)\/v1\/(.+)$/.exec(namespace);
  if (!match) return namespace;
  const resource = resourceNames[match[2]];
  if (!resource) throw new RouterError('invalid_argument','Unknown resource namespace');
  return `${match[1] === 'openai' ? 'open_ai' : match[1]}_${resource}`;
}
function validId(value) {
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= 256 && !/[\/\x00-\x1f\x7f-\x9f]/u.test(value);
}
function ownerValue(owner) {
  if (typeof owner === 'object' && owner !== null && typeof owner.client_kind === 'string' && owner.client_kind.trim() &&
      typeof owner.principal_id === 'string' && owner.principal_id.trim()) return {client_kind:owner.client_kind,principal_id:owner.principal_id};
  throw new RouterError('invalid_argument','Resource affinity requires a stable managed-client owner');
}
function sameOwner(left, right) { return left.client_kind === right.client_kind && left.principal_id === right.principal_id; }
function destinationValue(destination) {
  if (!destination || typeof destination.base_url !== 'string') throw new RouterError('invalid_argument','Resource destination is required');
  if (destination.kind === 'stored_provider') return {kind:destination.kind,name:destination.name,provider_kind:persistedProviderKind(destination.provider_kind),base_url:destination.base_url};
  if (destination.kind === 'subscription') return {kind:destination.kind,provider:destination.provider,account:destination.account,
    ...(destination.upstream_account_id != null ? {upstream_account_id:destination.upstream_account_id} : {}),base_url:destination.base_url};
  if (destination.destination_kind === 'stored_provider' || ['openai-compatible','lefine','z.ai-coding-plan'].includes(destination.provider_kind ?? destination.kind)) {
    return {kind:'stored_provider',name:destination.provider,provider_kind:persistedProviderKind(destination.provider_kind ?? destination.kind),base_url:destination.base_url};
  }
  return {kind:'subscription',provider:destination.oauth_provider ?? destination.provider_kind ?? destination.provider,account:destination.account,
    ...(destination.account_id != null ? {upstream_account_id:destination.account_id} : {}),base_url:destination.base_url};
}
function persistedProviderKind(kind) { return kind === 'z.ai-coding-plan' ? 'zai-coding-plan' : kind; }
function sameDestination(left, right) {
  return left.kind === right.kind && left.base_url === right.base_url && (left.kind === 'stored_provider'
    ? left.name === right.name && left.provider_kind === right.provider_kind
    : left.provider === right.provider && left.account === right.account && left.upstream_account_id === right.upstream_account_id);
}
function matchesExpectedRecord(record, expected) {
  if (!sameDestination(record.destination,destinationValue(expected.destination ?? expected))) return false;
  // Rust remove_if_matches compares ResponseAffinity itself, including lifetime
  // and owner fields. A view returned by get() carries those original fields;
  // a later identical destination with a different lifetime is another record.
  if (!Object.hasOwn(expected,'response_id')) return true;
  return record.namespace === affinityNamespace(expected.namespace) && record.response_id === expected.response_id &&
    sameOwner(record.owner,expected.owner) && (record.parent_id ?? null) === (expected.parent_id ?? null) &&
    record.created_at === expected.created_at && record.expires_at === expected.expires_at;
}
function view(record) {
  if (!record) return null;
  const value = record.destination;
  return {...structuredClone(record),id:record.response_id,destination:value.kind === 'stored_provider'
    ? {provider:value.name,account:value.name,protocol:'openai',provider_kind:value.provider_kind === 'zai-coding-plan' ? 'z.ai-coding-plan' : value.provider_kind,destination_kind:value.kind,base_url:value.base_url}
    : {provider:value.provider,account:value.account,protocol:value.provider === 'claude' ? 'anthropic' : 'responses',
      provider_kind:value.provider,destination_kind:value.kind,base_url:value.base_url,...(value.upstream_account_id != null ? {account_id:value.upstream_account_id} : {})}};
}
/** Resource ownership uses Rust's versioned links-notation document. */
export class AffinityStore {
  constructor({dataDir,persistent = true,clock = () => Math.floor(Date.now()/1000),ttl = 30*24*3600,maxRecords = 10000}) {
    try { exactInteger(ttl,1n,U64_MAX); } catch { throw new RouterError('invalid_config','response-affinity TTL and capacity must be non-zero'); }
    try { maxRecords=integerABI(exactInteger(maxRecords,1n,U64_MAX)); } catch { throw new RouterError('invalid_config','response-affinity TTL and capacity must be non-zero'); }
    this.path = join(dataDir,'response-affinities.lino'); this.persistent = persistent;
    this.clock = clock; this.ttl = ttl; this.maxRecords = maxRecords; this.records = [];
  }
  async load() {
    if (!this.persistent) return validateAffinityValue({version:1,records:structuredClone(this.records)});
    let source;
    try { source = new TextDecoder('utf-8',{fatal:true}).decode(await readFile(this.path)); }
    catch (error) {
      if(error.code === 'ENOENT') return {version:1,records:[]};
      throw new RouterError('invalid_storage',`response-affinity storage failed: ${error.message}`,503);
    }
    let file;
    try { file=decodeAffinityFile(source); }
    catch (error) { throw new RouterError('invalid_storage',`response-affinity document is invalid: ${error.message}`,503); }
    if(file.version!==1)throw new RouterError('invalid_storage',`unsupported response-affinity document version ${file.version}`,503);
    return file;
  }
  async verify() { return this.transaction(() => undefined,{prune:false}); }
  async transaction(operation,{prune=true,now:givenNow}={}) {
    const execute = async () => {
      if (this.persistent) {
        try { await recoverTransactionalWrite(this.path); }
        catch(error) { throw new RouterError('invalid_storage',`response-affinity storage failed: ${error.message}`,503); }
      }
      const file = await this.load();
      const oldLength = file.records.length;
      let now;
      if(prune) {
        now=exactInteger(givenNow ?? this.clock());
        file.records=file.records.filter(record=>exactInteger(record.expires_at)>now);
      }
      const state = {records:file.records,changed:file.records.length !== oldLength,now};
      const result = await operation(state);
      if (state.changed && this.persistent) {
        try { await transactionalWrite(this.path,encodeLino(validateAffinityValue({version:1,records:state.records}))); }
        catch(error) { throw new RouterError('invalid_storage',`response-affinity storage failed: ${error.message}`,503); }
      }
      this.records = state.records;
      return structuredClone(result);
    };
    return serialized(this.path,async () => {
      try { return await (this.persistent ? withAdvisoryFileLock(rustLockPath(this.path),execute) : execute()); }
      catch(error) {
        if(error instanceof RouterError || !error.code)throw error;
        throw new RouterError('invalid_storage',`response-affinity storage failed: ${error.message}`,503);
      }
    });
  }
  async get(namespace,owner,id,parentId) {
    if (!validId(id) || parentId != null && !validId(parentId)) return null;
    let normalized; try { normalized = ownerValue(owner); } catch { return null; }
    namespace = affinityNamespace(namespace);
    return this.transaction(({records}) => {
      const matching = records.filter(record => record.namespace === namespace && record.response_id === id && sameOwner(record.owner,normalized) &&
        (parentId === undefined || record.parent_id === parentId));
      return matching.length === 1 ? view(matching[0]) : null;
    });
  }
  async set(namespace,owner,id,{destination,parent_id,model} = {}) {
    if (!validId(id) || parent_id != null && !validId(parent_id)) throw new RouterError('invalid_argument','Invalid resource id');
    owner = ownerValue(owner); namespace = affinityNamespace(namespace); destination = validateAffinityValue(destinationValue(destination),'AffinityDestination');
    const requestedNow=exactInteger(this.clock());
    return this.transaction(state => {
      const existing = state.records.find(record => record.namespace === namespace && record.response_id === id && sameOwner(record.owner,owner) && (record.parent_id ?? null) === (parent_id ?? null));
      if (existing) {
        if (!sameDestination(existing.destination,destination)) throw new RouterError('affinity_collision','Resource id is bound to another upstream',409);
        // Original Existing returns before flush, including any in-memory prune.
        state.changed=false;
        return view(existing);
      }
      const now = integerABI(state.now);
      const record = validateAffinityValue({namespace,response_id:id,owner,destination,...(parent_id != null ? {parent_id} : {}),created_at:now,expires_at:affinityExpiry(now,this.ttl)},'ResponseAffinity');
      // Model is request metadata; Rust's persistent destination identity does not contain it.
      if (model != null) Object.defineProperty(record,'model',{value:model,enumerable:false});
      state.records.push(record); state.changed = true;
      if (state.records.length > this.maxRecords) {
        state.records.sort((left,right) => left.created_at<right.created_at ? -1 : left.created_at>right.created_at ? 1 : 0);
        state.records.splice(0,state.records.length-this.maxRecords);
      }
      return view(record);
    },{now:requestedNow});
  }
  async delete(namespace,owner,id,parentOrExpected,expected) {
    owner = ownerValue(owner); namespace = affinityNamespace(namespace);
    const parentId = typeof parentOrExpected === 'string' ? parentOrExpected : undefined;
    expected ??= typeof parentOrExpected === 'object' ? parentOrExpected : undefined;
    return this.transaction(state => {
      const oldLength = state.records.length;
      state.records = state.records.filter(record => record.namespace !== namespace || record.response_id !== id || !sameOwner(record.owner,owner) || parentId !== undefined && record.parent_id !== parentId ||
        expected && !matchesExpectedRecord(record,expected));
      state.changed ||= state.records.length !== oldLength;
      return state.records.length !== oldLength;
    },{prune:false});
  }
  async list(namespace,owner,parentId) {
    owner = ownerValue(owner); namespace = affinityNamespace(namespace);
    return this.transaction(({records}) => records.filter(record => record.namespace === namespace && sameOwner(record.owner,owner) &&
      (parentId === undefined || record.parent_id === parentId)).map(view));
  }
  async deleteChildren(namespace,owner,parentId,destination) {
    owner = ownerValue(owner); namespace = affinityNamespace(namespace); destination = destinationValue(destination);
    return this.transaction(state => {
      const oldLength = state.records.length;
      state.records = state.records.filter(record => record.namespace !== namespace || record.parent_id !== parentId || !sameOwner(record.owner,owner) || !sameDestination(record.destination,destination));
      state.changed ||= state.records.length !== oldLength;
      return oldLength-state.records.length;
    },{prune:false});
  }
}
