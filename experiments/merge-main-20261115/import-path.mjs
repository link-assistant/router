// Print the shortest static-import path from a module to a target file name.
// Usage: node import-path.mjs <from.mjs> <target-basename>
import fs from 'node:fs';import path from 'node:path';
const [from,target]=process.argv.slice(2);const prev=new Map([[path.resolve(from),null]]);const queue=[path.resolve(from)];
while(queue.length){const file=queue.shift();if(path.basename(file)===target){const chain=[];for(let f=file;f;f=prev.get(f))chain.unshift(path.relative(process.cwd(),f));console.log(chain.join('\n -> '));process.exit(0);}
 const src=fs.readFileSync(file,'utf8');for(const m of src.matchAll(/(?:^|[;\n])\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]/gu)){const next=path.resolve(path.dirname(file),m[1]);if(!prev.has(next)&&fs.existsSync(next)){prev.set(next,file);queue.push(next);}}}
console.log('no path');
