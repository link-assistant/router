// Read-only census: repository-path pins whose SHA-256 matched the branch before the main
// merge (<ref>, default 4f812e5ea^1) but no longer match the working tree.
// Historical "before" records that never matched <ref> are not reported.
// Usage: node stale-pins.mjs [ref]
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ref=process.argv[2]??'4f812e5ea^1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=execFileSync('git',['ls-files','-z','tools','scripts','parity','js','docs'],{maxBuffer:1<<28}).toString().split('\0').filter(f=>/\.(mjs|json|jsonl|txt)$/u.test(f));
const PATH='((?:rust|tools|scripts|js|src)/[A-Za-z0-9_./-]+\\.[a-z]+)';
const forms=[new RegExp(`"${PATH}"\\s*:\\s*"([0-9a-f]{64})"`,'gu'),new RegExp(`"(?:file|path|repositoryPath)"\\s*:\\s*"${PATH}"[^{}]{0,300}?"sha256"\\s*:\\s*"([0-9a-f]{64})"`,'gu')];
const current=new Map(),before=new Map();
const cur=p=>{if(!current.has(p))current.set(p,existsSync(p)&&statSync(p).isFile()?sha(readFileSync(p)):null);return current.get(p);};
const old=p=>{if(!before.has(p)){let v=null;try{v=sha(execFileSync('git',['show',`${ref}:${p}`],{maxBuffer:1<<28,stdio:['ignore','pipe','ignore']}));}catch{}before.set(p,v);}return before.get(p);};
const stale=new Map();
for(const holder of files){
  if(statSync(holder).size>8<<20)continue;
  const text=readFileSync(holder,'utf8');
  for(const form of forms)for(const [,p,pin] of text.matchAll(form)){
    const target=p.startsWith('src/')?'rust/'+p:p;
    if(cur(target)===pin)continue;
    if(old(target)!==pin)continue;
    if(!stale.has(target))stale.set(target,new Set());stale.get(target).add(holder);
  }
}
for(const [p,h] of [...stale].sort())console.log(`${p}\t${h.size}\t${[...h].slice(0,4).join(' ')}`);
console.error(`${stale.size} stale pinned paths`);
