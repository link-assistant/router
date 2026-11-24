#!/usr/bin/env node
// Data-only repository substitutions keep the Rust crate independently packable.
import {withProtectedPreparerWriter,allowPreparerSourceWrites,writePreparerSource,createPreparerAssetParents} from '../tools/translation/protected-preparer-writers-20261102.mjs';
import {constants,openSync,closeSync,fstatSync,lstatSync,readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sources=['LICENSE','schemas','openapi/router.yaml','ui/dist','docs/provider-evidence/anthropic-adaptive-thinking.json'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeMs,stat.ctimeMs].join(':');
function read(path) {
  const before=lstatSync(path);
  if(!before.isFile()||before.isSymbolicLink()||before.size>8*1024*1024)throw Error('Ordinary bounded asset required: '+path);
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    if(identity(fstatSync(fd))!==identity(before))throw Error('Asset changed at open');
    const bytes=readFileSync(fd);
    if(bytes.length!==before.size||identity(fstatSync(fd))!==identity(before)||identity(lstatSync(path))!==identity(before))throw Error('Asset changed during complete read');
    return bytes;
  } finally {closeSync(fd);}
}
function files(root,relative) {
  const info=lstatSync(join(root,relative));
  if(info.isSymbolicLink())throw Error('Linked asset source');
  if(info.isFile())return [relative];
  if(!info.isDirectory())throw Error('Unknown asset source');
  return readdirSync(join(root,relative)).sort().flatMap(name=>files(root,relative+'/'+name));
}
export function synchronizeRustAssets({root=ROOT,check=false}={}){
 root=resolve(root);const run=()=>{const rows=[],stale=[];
let total=0;
for(const source of sources.flatMap(source=>files(root,source))) {
  const bytes=read(join(root,source)),target='rust/'+source;
  total+=bytes.length;
  if(rows.length>=512||total>16*1024*1024)throw Error('Complete shared asset bound');
  rows.push({source,target,bytes:bytes.length,sha256:hash(bytes)});
  const path=join(root,target);
  const before=existsSync(path)?read(path):null;if(before!==null&&before.equals(bytes))continue;
  stale.push(target);
  if(!check){const row={path:target,before,after:bytes};allowPreparerSourceWrites(root,[row]);createPreparerAssetParents(root,target,()=>mkdirSync(dirname(path),{recursive:true}));writePreparerSource(root,row,()=>{if(before===null?existsSync(path):!existsSync(path)||!read(path).equals(before))throw Error('Original asset target changed before writing');writeFileSync(path,bytes);});if(!read(path).equals(bytes))throw Error('Complete asset readback differs');}
}
const wanted=new Set(rows.map(row=>row.target));
for(const target of sources.flatMap(source=>files(root,'rust/'+source)))if(!wanted.has(target))throw Error('Unexpected Rust shared asset retained: '+target);
const manifest=JSON.stringify({schema:'rust-shared-assets-v1',files:rows,bytes:total,semanticAuthority:false},null,2)+'\n';
const target=join(root,'rust/shared-assets.json');
const beforeManifest=existsSync(target)?read(target):null;if(beforeManifest===null||beforeManifest.toString('utf8')!==manifest){stale.push('rust/shared-assets.json');if(!check){const row={path:'rust/shared-assets.json',before:beforeManifest,after:manifest};allowPreparerSourceWrites(root,[row]);writePreparerSource(root,row,()=>{if(beforeManifest===null?existsSync(target):!existsSync(target)||!read(target).equals(beforeManifest))throw Error('Original asset manifest changed before writing');writeFileSync(target,manifest);});}}
if(check&&stale.length)throw Error('Stale Rust shared assets: '+stale.join(', '));
return {files:rows.length,bytes:total,mode:check?'check':'write',changed:stale.length,rustExecuted:false};
 };return check?run():withProtectedPreparerWriter(root,run);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))throw Error('Usage: node scripts/sync-rust-assets.mjs --write|--check');
 console.log(JSON.stringify(synchronizeRustAssets({check:args[0]==='--check'})));
}
