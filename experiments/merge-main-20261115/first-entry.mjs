// Simulate ESM DFS linking order from an entry; print the import stack at the first
// entry into any of the given target modules. Usage: node first-entry.mjs root entry target...
import {readFileSync,existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';
const [root,entry,...targets]=process.argv.slice(2);const T=new Set(targets.map(t=>resolve(root,t)));
const deps=f=>{if(!existsSync(f))return[];const s=readFileSync(f,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');return [...s.matchAll(/(?:^|\n)\s*(?:import|export)\s*(?:[^;'"]*?from\s*)?['"](\.[^'"]+)['"]/g)].map(m=>resolve(dirname(f),m[1]));};
const seen=new Set();
function visit(f,stack){if(seen.has(f))return false;seen.add(f);stack.push(f);if(T.has(f)){console.log(stack.map(x=>x.replace(resolve(root)+'/','')).join('\n -> '));return true;}for(const d of deps(f))if(visit(d,stack))return true;stack.pop();return false;}
visit(resolve(root,entry),[]);
