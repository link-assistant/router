/** Non-mutating source decoders and safe transactional token import. */
import {lstat} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readNativeText,requireNativePath} from './operation-input.mjs';
import {decodeTokenRecords,mergeSaferRecord,atomicWrite} from './storage.mjs';
import {readBinaryTokenRecords} from './doublets.mjs';
const fail=message=>Object.assign(new Error(message),{code:'token_import',exitCode:2});
const stat=async path=>lstat(path).catch(error=>{if (error.code==='ENOENT') return null;throw error;});
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));
  return value;
}
const same=(left,right)=>JSON.stringify(ordered(left))===JSON.stringify(ordered(right));
async function recordsFromFile(path) {
  await requireNativePath(path);const info=await stat(path);if (!info?.isFile()) throw fail('Token import source is not a regular file');
  if (extname(path)==='.bin') return readBinaryTokenRecords(path);
  const source=await readNativeText(path);
  if (extname(path)==='.lino') return decodeTokenRecords(source);
  if (extname(path)==='.json') {const records=JSON.parse(source);if (!Array.isArray(records)) throw fail('Token JSON export must be an array');return records;}
  throw fail('Token import requires a .lino, .bin or .json file');
}
export async function readTokenImportSource(path,{cwd=process.cwd(),validateRecord=()=>{}}={}) {
  path=resolve(cwd,path);await requireNativePath(path);const info=await stat(path);if (!info) throw fail('Token import source does not exist');
  const records=new Map();
  const merge=values=> {
    const fileIds=new Set();for (const value of values) {
      validateRecord(value);if (fileIds.has(value.id)) throw fail('Duplicate imported token id');fileIds.add(value.id);
      if (records.has(value.id)) mergeSaferRecord(records.get(value.id),value);else records.set(value.id,structuredClone(value));
    }
  };
  if (info.isFile()) merge(await recordsFromFile(path));
  else if (info.isDirectory()) {
    const filenames=['tokens.lino','tokens.bin','tokens.json'];
    const holds=async directory=>(await Promise.all(filenames.map(name=>stat(join(directory,name))))).some(info=>info?.isFile());
    if (!await holds(path) && await holds(join(path,'data'))) path=join(path,'data');
    let files=0;for (const name of filenames) {const file=join(path,name);if (await stat(file)) {merge(await recordsFromFile(file));files++;}}
    if (!files) throw fail('Token import directory holds no tokens.lino, tokens.bin or tokens.json');
  } else throw fail('Token import requires a file or directory');
  return [...records.values()].sort((left,right)=>left.id.localeCompare(right.id));
}
export async function importTokenRecords({source,store,options={},dataDir,clock=()=>Math.floor(Date.now()/1000)}) {
  const wanted=new Set(options.ids===undefined ? [] : Array.isArray(options.ids) ? options.ids : [options.ids]);
  const report={mode:options.replace ? 'replace' : 'merge-missing',dry_run:options.dry_run ?? false,source_records:source.length,target_records_before:0,
    added:[],unchanged:[],conflicts:[],replaced:[],kept_revoked:[],missing_from_source:[...wanted].filter(id=>!source.some(record=>record.id===id)).sort()};
  const apply=async records=> {
    report.target_records_before=records.size;const updates=[];
    for (const incoming of source) {
      if (wanted.size && !wanted.has(incoming.id)) continue;const existing=records.get(incoming.id);
      if (!existing) {report.added.push(incoming.id);updates.push(incoming);continue;}
      if (same(existing,incoming)) {report.unchanged.push(incoming.id);continue;}
      const fields=[...new Set([...Object.keys(existing),...Object.keys(incoming)])].filter(key=>!same(existing[key],incoming[key])).sort();
      if (!options.replace) {report.conflicts.push({id:incoming.id,fields});continue;}
      const replacement=mergeSaferRecord(structuredClone(incoming),existing);if (existing.revoked) report.kept_revoked.push(incoming.id);
      if (same(existing,replacement)) {report.unchanged.push(incoming.id);continue;}report.replaced.push({id:incoming.id,fields});updates.push(replacement);
    }
    if (report.dry_run || !updates.length) return;
    if (report.replaced.length) {
      const date=new Date(clock()*1000).toISOString().replace(/[-:]/g,'').replace('.000Z','Z');
      const backup=join(dataDir,'token-import-backups',`tokens-${date}-${randomUUID().replaceAll('-','').slice(0,8)}.json`);
      await requireNativePath(backup);await atomicWrite(backup,JSON.stringify([...records.values()].sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');report.backup=backup;
    }
    for (const record of updates) records.set(record.id,structuredClone(record));
  };
  if (report.dry_run) await apply(new Map((await store.list()).map(record=>[record.id,record])));else await store.transaction(apply);
  return report;
}
