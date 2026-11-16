// Static named-import link check for ESM files (no evaluation).
// Usage: node link-check.mjs file...   Reports imports whose named binding is
// not exported by a relative target module (follows `export *` re-exports).
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const cache=new Map();
function strip(src){return src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`\\])\/\/[^\n]*/g,'$1');}
function exportsOf(file,seen=new Set()){
  if(cache.has(file))return cache.get(file);if(seen.has(file))return new Set();seen.add(file);
  const out=new Set();if(!existsSync(file)||!statSync(file).isFile()){cache.set(file,null);return null;}
  const src=strip(readFileSync(file,'utf8'));
  for(const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s*\*?\s*([A-Za-z_$][\w$]*)/g))out.add(m[1]);
  for(const m of src.matchAll(/export\s+(?:const|let|var)\s+([^;=]+?)=/g))for(const n of m[1].matchAll(/([A-Za-z_$][\w$]*)/g))out.add(n[1]);
  for(const m of src.matchAll(/export\s*\{([^}]*)\}/g))for(const part of m[1].split(',')){const p=part.trim().split(/\s+as\s+/);if(p[0])out.add((p[1]??p[0]).trim().replace(/^['"]|['"]$/g,''));}
  if(/export\s+default/.test(src))out.add('default');
  for(const m of src.matchAll(/export\s*\*\s*from\s*['"](\.[^'"]+)['"]/g)){const t=exportsOf(resolve(dirname(file),m[1]),seen);if(t)for(const n of t)if(n!=='default')out.add(n);}
  for(const m of src.matchAll(/export\s*\*\s*as\s+([\w$]+)/g))out.add(m[1]);
  cache.set(file,out);return out;
}
let bad=0;
for(const file of process.argv.slice(2)){
  const src=strip(readFileSync(file,'utf8'));
  for(const m of src.matchAll(/(?:import|export)\s*(?:([\w$]+)\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)){
    const target=resolve(dirname(file),m[3]);const ex=exportsOf(target);
    if(ex===null){console.log(`${file}: missing module ${m[3]}`);bad++;continue;}
    for(const part of m[2].split(',')){const name=part.trim().split(/\s+as\s+/)[0].trim().replace(/^['"]|['"]$/g,'');if(name&&!ex.has(name)){console.log(`${file}: ${m[3]} lacks ${name}`);bad++;}}
  }
  for(const m of src.matchAll(/import\s*(?:[\w$*{][^'"]*from\s*)?['"](\.[^'"]+)['"]/g)){if(!existsSync(resolve(dirname(file),m[1]))){console.log(`${file}: missing module ${m[1]}`);bad++;}}
}
console.log(`link-check: ${bad} problems`);process.exitCode=bad?1:0;
