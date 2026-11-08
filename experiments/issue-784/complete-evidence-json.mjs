// Complete diagnostic payload storage only; never compiler authority.
import {existsSync,readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';

const LIMIT=32*1024*1024,ROOTS=['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines'];
export function currentEvidenceBytes(){
 let total=0;
 for(const root of ROOTS){const pending=[root];while(pending.length){const path=pending.pop();if(!existsSync(path))continue;const state=lstatSync(path);if(state.isSymbolicLink())continue;if(state.isDirectory()){for(const name of readdirSync(path))if(path!=='experiments/issue-784'||name!=='toolchain')pending.push(join(path,name));}else if(state.isFile())total+=state.size;}}
 return total;
}
export function readCompleteEvidenceJson(stem){
 const choices=[stem+'.gz',stem+'.xz'].filter(existsSync);
 if(choices.length!==1)throw Error('One complete diagnostic container required: '+stem);
 const packed=readFileSync(choices[0]);
 return choices[0].endsWith('.gz')?gunzipSync(packed,{maxOutputLength:LIMIT}):execFileSync('xz',['--decompress','--stdout'],{input:packed,maxBuffer:LIMIT});
}
export function writeCompleteEvidenceJson(stem,raw){
 if(!stem.startsWith('ci-logs/issue-784-restart-2/')||!stem.endsWith('.json')||raw.length>LIMIT)throw Error('Bounded task diagnostic required');
 if(existsSync(stem+'.gz')||existsSync(stem+'.xz'))throw Error('Refusing to replace complete diagnostic');
 const packed=execFileSync('xz',['--compress','--stdout','--threads=1','-1'],{input:raw,maxBuffer:LIMIT});
 const restored=execFileSync('xz',['--decompress','--stdout'],{input:packed,maxBuffer:LIMIT});
 if(!restored.equals(raw))throw Error('Complete diagnostic compression differs');
 const before=currentEvidenceBytes();if(before+packed.length>=500000000)throw Error('Complete diagnostic capacity refused before write: '+JSON.stringify({before,additional:packed.length}));
 const target=stem+'.xz';writeFileSync(target,packed,{flag:'wx'});
 if(!readCompleteEvidenceJson(stem).equals(raw))throw Error('Complete stored diagnostic readback differs');
 return target;
}
