#!/usr/bin/env node
// Data-only repository substitutions keep the Rust crate independently packable.
import {constants,openSync,closeSync,fstatSync,lstatSync,readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
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
function files(relative) {
  const info=lstatSync(join(root,relative));
  if(info.isSymbolicLink())throw Error('Linked asset source');
  if(info.isFile())return [relative];
  if(!info.isDirectory())throw Error('Unknown asset source');
  return readdirSync(join(root,relative)).sort().flatMap(name=>files(relative+'/'+name));
}
const args=process.argv.slice(2);
if(args.length!==1||!['--write','--check'].includes(args[0]))throw Error('Usage: node scripts/sync-rust-assets.mjs --write|--check');
const check=args[0]==='--check',rows=[],stale=[];
let total=0;
for(const source of sources.flatMap(files)) {
  const bytes=read(join(root,source)),target='rust/'+source;
  total+=bytes.length;
  if(rows.length>=512||total>16*1024*1024)throw Error('Complete shared asset bound');
  rows.push({source,target,bytes:bytes.length,sha256:hash(bytes)});
  const path=join(root,target);
  if(existsSync(path)&&read(path).equals(bytes))continue;
  stale.push(target);
  if(!check){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);if(!read(path).equals(bytes))throw Error('Complete asset readback differs');}
}
const wanted=new Set(rows.map(row=>row.target));
for(const target of sources.flatMap(source=>files('rust/'+source)))if(!wanted.has(target))throw Error('Unexpected Rust shared asset retained: '+target);
const manifest=JSON.stringify({schema:'rust-shared-assets-v1',files:rows,bytes:total,semanticAuthority:false},null,2)+'\n';
const target=join(root,'rust/shared-assets.json');
if(!existsSync(target)||read(target).toString('utf8')!==manifest){stale.push('rust/shared-assets.json');if(!check)writeFileSync(target,manifest);}
if(check&&stale.length)throw Error('Stale Rust shared assets: '+stale.join(', '));
console.log(JSON.stringify({files:rows.length,bytes:total,mode:check?'check':'write',changed:stale.length,rustExecuted:false}));
