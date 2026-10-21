// Primitive source transport only; never an owner/program/verdict cache.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {Buffer as SourceBuffer} from 'node:buffer';
import {originalAttributeOwnerBulkCryptoReady} from './attribute-owner-bulk-crypto.mjs';
import {originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {privateParserHostAvailable} from './private-parser-execution.mjs';
import {assertConcreteSyntaxHost} from './concrete-syntax-meta.mjs';
import {substitutePrivateConcreteSourceBatches} from './private-concrete-substitution-batch-candidate.mjs';
const get=Object.getOwnPropertyDescriptor,apply=Reflect.apply,has=Object.hasOwn,bufferPrototype=SourceBuffer.prototype,toString=get(bufferPrototype,'toString');
const fail=message=>{throw new TypeError('Whole owner source CST batch: '+message);};
// This source-only operation shares the existing trusted stock bootstrap. It
// does not authenticate a hostile cold Node wrapper from captured identity.
const bufferSource=toString&&has(toString,'value')&&typeof toString.value==='function'?originalCapturedFunctionSource(toString.value):null;
function bufferReady(){const actual=get(SourceBuffer.prototype,'toString');return SourceBuffer.prototype===bufferPrototype&&!!bufferSource&&actual&&has(actual,'value')&&actual.value===toString.value&&actual.writable===toString.writable&&actual.enumerable===toString.enumerable&&actual.configurable===toString.configurable&&originalCapturedFunctionSource(actual.value)===bufferSource;}
// Scheduling is deliberately UNQUALIFIED: the actual shared TypeScript5.9.3
// object exposes mutable callable/allocator slots and hidden compiler state.
// Crypto qualification cannot close that provider. A file hash or captured
// callable identity does not prove that no earlier setter registered a hook.
// No entered input Hash/native work is replayed: the generated entry takes its
// original fallback before that work. The parked bulk implementation below is
// not selected until a separate genuinely closed compiler operation exists.
export function wholeOwnerSourceCstBatchReady(){return false;}
export function wholeOwnerSourceCstBatchDomain(){return {schema:'whole-owner-source-cst-batch-domain-v1',batchingSelected:false,compilerClosureQualified:false,reason:'shared-TypeScript-scheduling-unclosed',originalFallbackBeforeInputHash:true,sourceAuthority:false,runtimeAuthority:false};}

const encoded=(bytes,encoding)=>apply(toString.value,bytes,[encoding]);
function completeInputs(root,inputs){return inputs.map(row=>{const bytes=readFileSync(resolve(root,row.path)),source=typeof row.source==='string'?encoded(bytes,'utf8'):encoded(bytes,'base64'),expected=typeof row.source==='string'?row.source:row.base64;if(source!==expected)fail('complete captured source input differs: '+row.path);return {path:row.path,source,encoding:typeof row.source==='string'?'utf8':'base64'};});}
function verify(root,inputs,files){
 if(!wholeOwnerSourceCstBatchReady()||!originalAttributeOwnerBulkCryptoReady()||!bufferReady()||!privateParserHostAvailable())fail('qualified source operations changed');assertConcreteSyntaxHost();
 for(const row of inputs)if(encoded(readFileSync(resolve(root,row.path)),row.encoding)!==row.source)fail('complete input changed around source transport: '+row.path);
 for(const row of files){const path=resolve(root,row.path),current=existsSync(path)?readFileSync(path,'utf8'):null;if(current!==row.current)fail('complete observed output changed around source transport: '+row.path);}
}
export function finishWholeOwnerSourceCstBatch({root,inputs,files,pending,count}){
 if(files.length!==count||pending.length!==count||new Set(files.map(row=>row.path)).size!==count||pending.some((row,at)=>row.record!==files[at]))fail('complete ordered original source row census differs');
 if(!wholeOwnerSourceCstBatchReady())fail('qualified source operations changed before input capture');assertConcreteSyntaxHost();
 const captured=completeInputs(root,inputs);verify(root,captured,files);
 try{
  for(let at=0;at<pending.length;at+=3){const rows=pending.slice(at,at+3),batch=substitutePrivateConcreteSourceBatches(rows.map(row=>row.request));if(batch.schema!=='private-concrete-source-substitution-batches-v1'||batch.rows.length!==rows.length||batch.sourceAuthority!==false||batch.runtimeAuthority!==false)fail('complete bounded source transaction differs');
   for(let index=0;index<rows.length;index++){
    const {record}=rows[index],fragment=JSON.parse(batch.rows[index]);if(Object.keys(fragment).join(',')!=='beforeMeta,afterMeta,inverse,stages,trace'||fragment.inverse!==record.before||fragment.stages.length!==2)fail('complete original source fragment differs');const first=fragment.stages[0],last=fragment.stages[1];
    if(first.phase!=='language'||last.phase!=='repository'||first.before!==record.before||first.after!==record.language||last.before!==record.language||last.after!==record.after||first.completeInverse!==true||last.completeInverse!==true||first.trace.length!==2||last.trace.length!==2||first.trace[1].rules.length||last.trace[0].rules.length)fail('complete original language/repository inverse association differs');
    record.beforeMeta=fragment.beforeMeta;record.afterMeta=fragment.afterMeta;record.trace=[first.trace[0],last.trace[1]];
    if(record.inverse!==record.before)fail('original whole inverse source differs');
   }
  }
  verify(root,captured,files);
 }finally{pending.length=0;captured.length=0;}
}
