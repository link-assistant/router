// Refresh one live {"file":P,"bytes":N,"sha256":H} pin row in one holder module to the
// current bytes of P, only when the old row matched P at <ref> (pre-merge branch tip).
// Prints the exact old and new values. Historical records are never rewritten.
// Usage: node refresh-pin.mjs <holder> <pinned-file> [ref]
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [holder,file,ref='4f812e5ea^1']=process.argv.slice(2);
const sha=b=>createHash('sha256').update(b).digest('hex');
const before=execFileSync('git',['show',`${ref}:${file}`],{maxBuffer:1<<28});
const now=readFileSync(file);
const text=readFileSync(holder,'utf8');
const oldRow=`"file":"${file}","bytes":${before.length},"sha256":"${sha(before)}"`;
const newRow=`"file":"${file}","bytes":${now.length},"sha256":"${sha(now)}"`;
const count=text.split(oldRow).length-1;
if(count!==1){console.error(`expected one pre-merge row, found ${count}`);process.exit(1);}
writeFileSync(holder,text.replace(oldRow,newRow));
console.log(`${holder}: ${file} ${before.length}/${sha(before)} -> ${now.length}/${sha(now)}`);
