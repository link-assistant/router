// Source proposal only. Do not execute during issue759 bulk drafting.
import {readFileSync,lstatSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from '../tools/translation/selected-source-reader-20261101.mjs';
import {copyMetadata} from '../tools/translation/extensions/source-links.mjs';
import {proposeDependentConcreteSourceBatch} from '../tools/translation/dependent-concrete-source-batch.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function prepareDependentSourceBatch(input){
 const plan=copyMetadata(input);
 if(!plan||Object.keys(plan).sort().join(',')!=='files,rules'||!Array.isArray(plan.files)||!plan.files.length||plan.files.length>256)throw TypeError('complete bounded dependent source plan required');
 return withSelectedTrackedSourceOperation(root,()=>{const files=plan.files.map(row=>{if(!row||Object.keys(row).sort().join(',')!=='before,language,path')throw TypeError('exact complete source predecessor descriptor required');const current=new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(root,row.path,{maxBytes:2097152}));return {...row,current};});return proposeDependentConcreteSourceBatch({files,rules:plan.rules});},{limits:{paths:256,bytes:16777216}});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1)throw TypeError('use one complete source-plan JSON path; output is a proposal only');const path=resolve(args[0]),info=lstatSync(path);if(!info.isFile()||info.isSymbolicLink()||info.size>16777216)throw TypeError('bounded ordinary source plan required');const raw=readFileSync(path);if(raw.length!==info.size)throw TypeError('complete source plan changed');const result=prepareDependentSourceBatch(JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw))),output=JSON.stringify(result);if(Buffer.byteLength(output)>67108864)throw TypeError('complete source proposal output capacity');console.log(output);}
