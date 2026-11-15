// Print a static import path from an entry module to a target module (relative imports only).
// Usage: node cycle-path.mjs entry.mjs target.mjs
import {readFileSync,existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';
const [entry,target]=process.argv.slice(2).map(p=>resolve(p));
const deps=f=>{if(!existsSync(f))return[];const s=readFileSync(f,'utf8');return [...s.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*['"](\.[^'"]+)['"]/g)].map(m=>resolve(dirname(f),m[1]));};
const prev=new Map([[entry,null]]),q=[entry];
while(q.length){const f=q.shift();if(f===target)break;for(const d of deps(f))if(!prev.has(d)){prev.set(d,f);q.push(d);}}
if(!prev.has(target)){console.log('no path');process.exit(0);}
const path=[];for(let f=target;f;f=prev.get(f))path.unshift(f.replace(process.cwd()+'/',''));console.log(path.join('\n -> '));
