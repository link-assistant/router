// Compose complete committed predecessors with the actual current producer.
import {readFileSync,lstatSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {deriveNativeOutputTextSourceSet,deriveCurrentNativeOutputTextSourceSet,deriveNativeMatrixBoundarySources} from './prepare-native-output-text-retention.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';
import {prepareOwnedFieldBulkSources,assertOwnedFieldBulkInputsFresh} from './prepare-owned-field-bulk.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-sequential-phases.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/';
const ARCHIVE=P+'source-profiles/native-output-text-retention/complete-predecessors.json.gz';
const PIN='e6f00674b68660f6bb854d6b9da0b26eeadac1c60e36e4025f3f95a4cd0aa218';
const RAW='43c257127b3928c5e6206ffb444d95cf60265f6e31d3fab6ce1cea76c8887666';
const TRACE_ARCHIVE=P+'source-profiles/native-output-text-retention/matrix-trace-predecessors.json.gz';
const TRACE_PIN='ad338ca9c87d04f4032b7d78f2a38659b5289410835d4690f78bcf937308a0d9';
const TRACE_RAW='8e2dd3c93d7b10343d15ffecf02b46da92665059b8012bbe110d117a6a0b3a43';
const SELF=P+'prepare-current-native-output-text-retention.mjs',PRODUCER=P+'prepare-native-output-text-retention.mjs';
const INPUTS=['private-output-text.mjs','retained-owned-field-bulk.mjs','retained-owned-field-matrix-bulk.mjs','isolated-retained-owned-field-matrix-bulk.mjs','owned-field-isolated-matrix-session.mjs','owned-field-isolated-matrix-profile.mjs'].map(name=>P+name).concat('scripts/translate-router-owned-field-meta.mjs');
const OUTPUTS=['private-native-output-text.mjs','native-retained-owned-field-bulk.mjs','native-retained-owned-field-matrix-bulk.mjs','isolated-native-retained-owned-field-matrix-bulk.mjs','native-owned-field-isolated-matrix-session.mjs','native-owned-field-isolated-matrix-profile.mjs'].map(name=>P+name).concat('scripts/translate-router-native-owned-field-meta.mjs');
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Current native output retention: '+message);};
function regular(root,path){const full=resolve(root,path),state=lstatSync(full);if(!state.isFile()||state.isSymbolicLink()||state.size>1048576)fail('complete regular bounded source required: '+path);const bytes=readFileSync(full),source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('complete UTF8 source differs');return {path,source,bytes:bytes.length,sha256:hash(bytes)};}
export function readNativeOutputRetentionPredecessors({root=ROOT}={}){
 root=resolve(root);const state=lstatSync(resolve(root,ARCHIVE)),packed=readFileSync(resolve(root,ARCHIVE));
 if(!state.isFile()||state.isSymbolicLink()||packed.length!==40658||hash(packed)!==PIN)fail('complete predecessor archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:1048576});if(raw.length!==180094||hash(raw)!==RAW)fail('complete predecessor bytes differ');
 const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));
 if(value.schema!=='complete-native-retention-predecessor-sources-v1'||value.commit!=='a7bcf9526b0835f634b900e91fc30fc9c8301581'||value.files.length!==17)fail('complete committed predecessor universe differs');
 const names=[...INPUTS,...OUTPUTS,PRODUCER,P+'native-output-text-kernels.mjs',P+'source-copy-native-bindings.mjs'];
 const sources=new Map();for(const row of value.files){if(!names.includes(row.path)||sources.has(row.path)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('complete predecessor source/hash join differs');sources.set(row.path,row);}
 if(sources.size!==names.length)fail('complete predecessor source census differs');
 return {path:ARCHIVE,bytes:packed.length,sha256:PIN,decodedBytes:raw.length,decodedSha256:RAW,...value};
}
export function readNativeMatrixTracePredecessors({root=ROOT}={}){
 root=resolve(root);const state=lstatSync(resolve(root,TRACE_ARCHIVE)),packed=readFileSync(resolve(root,TRACE_ARCHIVE));
 if(!state.isFile()||state.isSymbolicLink()||packed.length!==36107||hash(packed)!==TRACE_PIN)fail('complete matrix trace predecessor archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:1048576});if(raw.length!==158418||hash(raw)!==TRACE_RAW)fail('complete matrix trace predecessor bytes differ');
 const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw)),names=[...INPUTS,...OUTPUTS];
 if(value.schema!=='complete-native-matrix-trace-predecessors-v1'||value.commit!=='52e2c0461f00e79a1dcd04b475138acd3ec28d17'||value.files.length!==names.length)fail('complete matrix trace predecessor universe differs');
 const sources=new Map();for(const row of value.files){if(!names.includes(row.path)||sources.has(row.path)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('complete matrix trace predecessor source/hash join differs');sources.set(row.path,row);}
 if(sources.size!==names.length)fail('complete matrix trace predecessor census differs');
 return {path:TRACE_ARCHIVE,bytes:packed.length,sha256:TRACE_PIN,decodedBytes:raw.length,decodedSha256:TRACE_RAW,...value};
}
export function prepareCurrentNativeOutputTextRetention({root=ROOT}={}){
 root=resolve(root);const inputs=[],read=path=>{const row=regular(root,path);inputs.push(row);return row.source;};
 const history=readNativeOutputRetentionPredecessors({root}),archived=new Map(history.files.map(row=>[row.path,row]));
 const prior=prepareOwnedFieldBulkSources({root});if(prior.files.length!==9)fail('all nine actual prerequisite equations required');
 for(const row of prior.files)if(read(row.path)!==row.text)fail('actual owned-field prerequisite stale: '+row.path);
 const oldFiles=deriveNativeOutputTextSourceSet(INPUTS.map(path=>({path,source:archived.get(path).source})));
 for(const [at,row]of oldFiles.entries())if(row.path!==OUTPUTS[at]||row.after!==archived.get(row.path).source||row.inverse!==archived.get(INPUTS[at]).source)fail('complete native predecessor equation differs');
 const traceHistory=readNativeMatrixTracePredecessors({root}),traceSources=new Map(traceHistory.files.map(row=>[row.path,row]));
 const files=deriveCurrentNativeOutputTextSourceSet(INPUTS.map(path=>({path,source:read(path)})));
 const boundaries=deriveNativeMatrixBoundarySources(INPUTS.slice(4,6).map(path=>({path,source:traceSources.get(path).source})));
 // Five rows have identical complete inputs and outputs in both cohorts. Reuse
 // those source equations within this invocation; semantic checks remain fresh
 // for the entire historical cohort, including both separately derived rows.
 const traceFiles=files.map((row,at)=>({...([4,5].includes(at)?boundaries[at-4]:row)}));
 for(const [at,row]of traceFiles.entries())if(row.path!==OUTPUTS[at]||row.before!==traceSources.get(INPUTS[at]).source||row.after!==traceSources.get(row.path).source||row.inverse!==traceSources.get(INPUTS[at]).source)fail('complete matrix trace predecessor equation differs');
 const traceBindings=verifyNativeCopiedModuleBindings(ownershipCompiler(),traceFiles.map(({path,after})=>({path,source:after})));
 for(const [at,row]of traceFiles.entries())row.nativeBindings=traceBindings[at];
 for(const [at,row]of files.entries()){
  if(row.path!==OUTPUTS[at]||row.before!==inputs.find(input=>input.path===INPUTS[at]).source)fail('complete current source association differs');
  row.current=read(row.path);if(row.current!==oldFiles[at].after&&row.current!==traceFiles[at].after&&row.current!==row.after)fail('unknown complete native source: '+row.path);
 }
 const producer=read(PRODUCER),kernels=read(P+'native-output-text-kernels.mjs');read(P+'source-copy-native-bindings.mjs');read(SELF);
 if(kernels!==archived.get(P+'native-output-text-kernels.mjs').source)fail('complete native codec kernels changed');
 const transitions=transportConcreteNamedSourcePhases([
  ...files.map((row,at)=>({before:oldFiles[at].after,middle:oldFiles[at].after,after:row.after,language:'JavaScript',rules:['language:preserve-complete-native-storage-bodies','repository:follow-actual-matrix-draft-custody','language:restore-complete-native-storage-bodies','repository:restore-whole-native-predecessor']})),
  {before:archived.get(PRODUCER).source,middle:producer,after:producer,language:'JavaScript',rules:['language:share-fresh-native-module-scope-checks','repository:retain-original-native-output-proposal','language:restore-whole-original-native-producer','repository:restore-original-native-proposal']},
 ]);
 for(const [at,row]of files.entries()){row.historical=oldFiles[at];row.sourceHistory=transitions[at];if(row.sourceHistory.before!==row.historical.after||row.sourceHistory.after!==row.after||row.sourceHistory.inverse!==row.historical.after)fail('complete native source-history join differs');}
 const plan={schema:'complete-current-native-output-retention-v1',root,files,inputs,history,traceHistory,traceFiles,prerequisites:{ownedField:prior},producerEvolution:{path:PRODUCER,equation:transitions.at(-1)},semanticAuthority:false,performanceQualified:false,runtimeParity:false,rustExecuted:false};
 assertCurrentNativeOutputTextInputsFresh(plan);return plan;
}
export function assertCurrentNativeOutputTextInputsFresh(plan){
 assertOwnedFieldBulkInputsFresh(plan.prerequisites.ownedField);
 for(const row of plan.inputs){const current=regular(plan.root,row.path);if(current.source!==row.source||current.bytes!==row.bytes||current.sha256!==row.sha256)fail('complete physical source changed: '+row.path);}
 const history=readNativeOutputRetentionPredecessors({root:plan.root});if(history.sha256!==plan.history.sha256)fail('complete predecessor archive changed');
 const traceHistory=readNativeMatrixTracePredecessors({root:plan.root});if(traceHistory.sha256!==plan.traceHistory.sha256)fail('complete matrix trace predecessor archive changed');return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(!(args.length===1&&args[0]==='--check'||args.length===2&&args[0]==='--emit'))fail('use --check|--emit FRESH_GZIP');
 const plan=prepareCurrentNativeOutputTextRetention();
 if(args[0]==='--check'){if(plan.files.some(row=>row.current!==row.after))fail('complete current native outputs are stale');console.log(JSON.stringify({fresh:true,files:plan.files.map(({path,afterSha256})=>({path,sha256:afterSha256})),qualified:false}));}
 else{const raw=Buffer.from(JSON.stringify(plan)+'\n');if(raw.length>64*1024*1024)fail('complete source proposal byte bound');assertCurrentNativeOutputTextInputsFresh(plan);writeFileSync(args[1],gzipSync(raw),{flag:'wx'});if(!gunzipSync(readFileSync(args[1]),{maxOutputLength:64*1024*1024}).equals(raw))fail('complete source proposal readback differs');assertCurrentNativeOutputTextInputsFresh(plan);console.log(JSON.stringify({proposal:args[1],files:plan.files.map(({path,afterSha256})=>({path,sha256:afterSha256})),qualified:false}));}
}
