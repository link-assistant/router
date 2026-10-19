import {repositoryRustLayout,rustPackageSourcePath} from './repository-layout.mjs';
// Explicit repository storage: packets and hashes are evidence, never permits.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readdirSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {trackedSourceBytes,sourceCorpusPaths} from './source-corpus.mjs';
import {discoverCompilerSourceInputs} from './compiler-source-inputs.mjs';
import {discoverSourceProfileInputs} from './source-profile-inputs.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
import {prepareForwardJsonReaderPair} from './forward-owned-json-reader-definitions.mjs';
export const OWNED_DEFINITION_ROOTS=Object.freeze(['tools/translation/generated/owned-definitions','js/generated/rust-owned-definitions','ts/generated/rust-owned-definitions']);
export const OWNED_DEFINITION_LIMITS=Object.freeze({packetBytes:16*1024*1024,evidenceBytes:384*1024*1024,paths:32768,filesBytes:256*1024*1024});
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const compilerRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),states=new WeakMap(),fail=message=>{throw TypeError('Owned definition output: '+message);};
export const ownedDefinitionHash=value=>createHash('sha256').update(value).digest('hex');
export function ownedDefinitionPath(path){if(typeof path!=='string'||!path||path.length>4096||path.includes('\\')||path.includes(':')||path.includes('\0')||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('unsafe relative path');return path;}
export function ownedDefinitionPhysical(root,path,missing=false){
 let current=resolve(root);const parts=ownedDefinitionPath(path).split('/');
 for(let at=0;at<parts.length;at++){current=join(current,parts[at]);try{const stat=lstatSync(current);if(stat.isSymbolicLink()||at<parts.length-1&&!stat.isDirectory())fail('linked or non-directory input');}catch(error){if(!missing||error.code!=='ENOENT')throw error;}}
 return current;
}
function strict(bytes){const source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('source is not strict UTF8');return source;}
export function ownedDefinitionRead(root,path,max=32*1024*1024){const absolute=ownedDefinitionPhysical(root,rustPackageSourcePath(root,path)),stat=lstatSync(absolute);if(!stat.isFile()||stat.size>max)fail('regular-file byte bound');const bytes=readFileSync(absolute);if(bytes.length>max)fail('read byte bound');return strict(bytes);}
function installedTypes(){
 const base=realpathSync(join(compilerRoot,'js/node_modules/typescript')),rows=[];let total=0;
 function visit(dir){for(const name of readdirSync(join(base,dir)).sort()){const path=dir?dir+'/'+name:name,absolute=join(base,path),stat=lstatSync(absolute);if(stat.isSymbolicLink())fail('linked installed compiler');if(stat.isDirectory())visit(path);else{if(!stat.isFile()||stat.size>32*1024*1024||rows.length>=512)fail('installed compiler bound');const bytes=readFileSync(absolute);total+=bytes.length;if(total>64*1024*1024)fail('installed compiler total bound');rows.push({path,bytes:bytes.length,sha256:ownedDefinitionHash(bytes)});}}}
 visit('');const pkg=JSON.parse(readFileSync(join(base,'package.json'),'utf8'));if(pkg.version!=='5.9.3')fail('requires installed TypeScript 5.9.3');return {base,version:pkg.version,rows};
}
function sourceState(root,sources,corpus){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:30000});
 const trackedPaths=git('ls-files','-z','--','*.rs').split('\0').filter(Boolean).sort();
 const paths=corpus?sourceCorpusPaths(corpus,root):(sources??trackedPaths).slice().sort();
 if(!paths.length||paths.length>20000||new Set(paths).size!==paths.length)fail('source census bound');
 const cargoPaths=repositoryRustLayout(root).cargoInputs,trackedCargo=git('ls-files','-z','--',...cargoPaths).split('\0').filter(Boolean);
 const inputs=[];let total=0;
 for(const path of [...paths,...cargoPaths]){
  ownedDefinitionPath(path);if(!path.endsWith('.rs')&&!existsSync(join(root,path))&&!trackedCargo.includes(path))continue;
  if(existsSync(join(root,path)))ownedDefinitionPhysical(root,path);
  const bytes=trackedSourceBytes(root,path,{maxBytes:8*1024*1024});total+=bytes.length;if(total>80*1024*1024)fail('source corpus bytes');inputs.push({path,source:strict(bytes),bytes:bytes.length,sha256:ownedDefinitionHash(bytes)});
 }
 return {head:git('rev-parse','HEAD').trim(),trackedPaths,paths,inputs};
}
export function captureOwnedDefinitionInputs(root,sources,corpus){
 root=resolve(root);const source=sourceState(root,sources,corpus),compiler=discoverCompilerSourceInputs({root:compilerRoot}),profiles=discoverSourceProfileInputs({root:compilerRoot}),typescript=installedTypes();
 const handle=Object.freeze({schema:'owned-definition-current-inputs-v1'});states.set(handle,freeze({root,source,compiler,profiles,typescript}));return handle;
}
export function ownedDefinitionInputsDescription(handle){const state=states.get(handle);if(!state)fail('unissued input capture');return {schema:handle.schema,trackedPaths:state.source.trackedPaths,sources:state.source.inputs.map(({source,...row})=>row),compiler:state.compiler,profiles:state.profiles,typescript:{version:state.typescript.version,rows:state.typescript.rows},semanticAuthority:false};}
export function requireOwnedDefinitionInputs(handle){
 const state=states.get(handle);if(!state)fail('unissued current input capture');const now=sourceState(state.root,state.source.paths);
 if(JSON.stringify(now)!==JSON.stringify(state.source)||JSON.stringify(discoverCompilerSourceInputs({root:compilerRoot}))!==JSON.stringify(state.compiler)||JSON.stringify(discoverSourceProfileInputs({root:compilerRoot}))!==JSON.stringify(state.profiles)||JSON.stringify(installedTypes())!==JSON.stringify(state.typescript))fail('current source/compiler/profile/TypeScript changed');
}
export function encodeOwnedDefinitionPacket(value){
 const raw=JSON.stringify(value)+'\n',bytes=Buffer.from(raw);if(bytes.length>OWNED_DEFINITION_LIMITS.packetBytes)fail('packet byte bound');const compressed=gzipSync(bytes,{level:9}),text=compressed.toString('base64')+'\n';
 if(!gunzipSync(compressed,{maxOutputLength:OWNED_DEFINITION_LIMITS.packetBytes}).equals(bytes))fail('packet whole readback changed');return {text,rawBytes:bytes.length,rawSha256:ownedDefinitionHash(bytes),bytes:Buffer.byteLength(text),sha256:ownedDefinitionHash(text)};
}
export function decodeOwnedDefinitionPacket(text,row){
 if(typeof text!=='string'||Buffer.byteLength(text)!==row.bytes||ownedDefinitionHash(text)!==row.sha256||!text.endsWith('\n'))fail('packet stored bytes changed');const encoded=text.slice(0,-1),compressed=Buffer.from(encoded,'base64');if(compressed.toString('base64')!==encoded)fail('noncanonical packet encoding');
 const bytes=gunzipSync(compressed,{maxOutputLength:OWNED_DEFINITION_LIMITS.packetBytes});if(bytes.length!==row.rawBytes||ownedDefinitionHash(bytes)!==row.rawSha256)fail('packet raw bytes changed');const source=strict(bytes),value=JSON.parse(source);if(JSON.stringify(value)+'\n'!==source)fail('noncanonical JSON packet');return value;
}
export function requireOwnedDefinitionStage(stage){
 if(!stage||transportConcreteSyntaxMeta(stage.before.meta).source!==stage.before.source||transportConcreteSyntaxMeta(stage.after.meta).source!==stage.after.source||ownedDefinitionHash(stage.before.source)!==stage.before.sha256||ownedDefinitionHash(stage.after.source)!==stage.after.sha256)fail('complete concrete source changed');
 let before=0,after=0,undo=stage.after.source;
 for(const row of stage.mapping){if(row.before[0]!==before||row.after[0]!==after)fail('source partition gap');if(row.kind==='unchanged'){if(stage.before.source.slice(...row.before)!==stage.after.source.slice(...row.after))fail('unchanged source differs');}else if(row.kind==='substitution'){if(stage.before.source.slice(...row.before)!==row.expected||stage.after.source.slice(...row.after)!==row.replacement)fail('substitution differs');}else fail('unknown source mapping');before=row.before[1];after=row.after[1];}
 if(before!==stage.before.source.length||after!==stage.after.source.length)fail('source partition incomplete');for(const row of [...stage.mapping].reverse())if(row.kind==='substitution')undo=undo.slice(0,row.after[0])+row.expected+undo.slice(row.after[1]);if(undo!==stage.before.source)fail('complete inverse differs');
}
function put(expected,path,text){ownedDefinitionPath(path);if(typeof text!=='string'||expected.has(path))fail('duplicate/nontext output');expected.set(path,text);}
export function packageOwnedDefinitions({result,entry,expected,outputRoots,prefix,profile,inputs,assets,hostAssets}){
 if(result?.schema!=='forward-owned-json-definitions-v1'||!Array.isArray(result.definitions)||!Array.isArray(result.parents)||!Array.isArray(result.unsupported))fail('actual forward definition result absent');
 ownedDefinitionPath(entry);if(!entry.endsWith('.rs'))fail('entry source required');const stem=entry.slice(0,-3),metaRoot=outputRoots[6]+'/'+stem,jsRoot=outputRoots[7]+'/'+stem,tsRoot=outputRoots[8]+'/'+stem,packets=[],definitions=[];
 const packet=(name,value)=>{const encoded=encodeOwnedDefinitionPacket(value),path=metaRoot+'/'+name+'.json.gz.b64';put(expected,path,encoded.text);const {text,...description}=encoded;const row={path,...description};packets.push(row);return row;};
 for(let at=0;at<result.parents.length;at++)packet('parent_'+at,result.parents[at]);
 const identities=new Set();for(let at=0;at<result.definitions.length;at++){
  const row=result.definitions[at];if(identities.has(row.identity))fail('duplicate definition identity');identities.add(row.identity);
  if(row.javascriptPath!=='app/owned-definitions/definition_'+at+'.mjs'||row.typescriptPath!=='typed/owned-definitions/definition_'+at+'.mts')fail('unexpected actual definition path');requireOwnedDefinitionStage(row.javascript);requireOwnedDefinitionStage(row.typescript);
  const captured=states.get(inputs)?.source.inputs.find(value=>value.path===row.source);if(!captured||captured.sha256!==row.sourceSha256)fail('actual parent differs from captured whole source');
  const parent=result.parents.find(value=>value.id===row.original.parent);if(!parent||parent.source!==captured.source||parent.file!==row.source||ownedDefinitionHash(parent.source)!==row.sourceSha256||parent.sha256!==row.sourceSha256||parent.source.slice(row.span.start,row.span.end)!==row.original.source||ownedDefinitionHash(row.original.source)!==row.original.sha256)fail('complete original source selection differs');
  const javascript=jsRoot+'/'+row.javascriptPath.slice(4),typescript=tsRoot+'/'+row.typescriptPath.slice(6);if(row.canonicalAbi==='registered-json-reader-definition-v1')prepareForwardJsonReaderPair(javascript,row.javascript.after.source,typescript,row.typescript.after.source);else prepareOwnedCorePairedTypes(javascript,row.javascript.after.source,typescript,row.typescript.after.source);
  put(expected,javascript,row.javascript.after.source);put(expected,typescript,row.typescript.after.source);definitions.push({identity:row.identity,name:row.name,original:{file:row.source,parentSha256:row.sourceSha256,span:row.span,sha256:row.original.sha256},javascript,typescript,packet:packet('definition_'+at,row)});
 }
 // Preserve all fields, including future reviewed diagnostics; never manufacture success.
 const {definitions:ignoredDefinitions,parents:ignoredParents,...summary}=result;packet('complete-result-fields',summary);
 const runtime=new Map(hostAssets);runtime.set('effects.mjs',assets.javascript);runtime.set('effects.d.mts',assets.declarations);
 for(const root of [jsRoot,tsRoot])for(const [name,text]of runtime)put(expected,root+'/runtime/'+name,text);
 const files=[];for(const path of expected.keys())if([metaRoot,jsRoot,tsRoot].some(root=>path.startsWith(root+'/'))){const text=expected.get(path);files.push({path,bytes:Buffer.byteLength(text),sha256:ownedDefinitionHash(text)});}
 const index={schema:'materialized-owned-definitions-project-v1',entry,prefix:prefix||null,compilationProfile:profile,inputs:ownedDefinitionInputsDescription(inputs),definitions,packets,files,moduleStartupEquivalent:false,runtimeParity:false,applicationEffectCompleteness:false};
 const path=metaRoot+'/index.json';put(expected,path,JSON.stringify(index)+'\n');return {entry,index:path,sha256:ownedDefinitionHash(expected.get(path)),definitions:definitions.length};
}
export function finishOwnedDefinitionOutput(expected,{projects,outputRoots,prefix,profile,inputs}){
 const index={schema:'materialized-owned-definitions-inventory-v1',projects,prefix:prefix||null,compilationProfile:profile,inputs:ownedDefinitionInputsDescription(inputs),runtimeParity:false,moduleStartupEquivalent:false,limits:OWNED_DEFINITION_LIMITS};put(expected,outputRoots[6]+'/index.json',JSON.stringify(index)+'\n');
 let bytes=0,paths=0;for(const path of expected.keys())if(outputRoots.slice(6).some(root=>path.startsWith(root+'/'))){bytes+=Buffer.byteLength(expected.get(path));paths++;}if(bytes>OWNED_DEFINITION_LIMITS.evidenceBytes||paths>OWNED_DEFINITION_LIMITS.paths)fail('evidence output bound');
}
export function validateOwnedDefinitionOutput(root,expected,outputRoots,inputs){requireOwnedDefinitionInputs(inputs);for(const path of expected.keys())if(outputRoots.slice(6).some(base=>path.startsWith(base+'/')))ownedDefinitionPhysical(root,path,true);}
export function legacyOwnedDefinitionOutputs(plan){
 const roots=OWNED_DEFINITION_ROOTS.map(root=>(plan.outputPrefix?plan.outputPrefix+'/':'')+root);return plan.outputs.filter(row=>!roots.some(root=>row.path.startsWith(root+'/')));
}
export function ownedDefinitionMatrixContent({matrix,outputPlans,sourceSetSha256}){return JSON.stringify({schema:'materialized-owned-definitions-matrix-v1',matrixSha256:matrix.sha256,sourceSetSha256,profiles:outputPlans.map(({member,plan})=>({name:member.name,profileSha256:member.sha256,directory:member.directory,index:member.directory+'/'+OWNED_DEFINITION_ROOTS[0]+'/index.json',outputs:plan.outputs.filter(row=>!legacyOwnedDefinitionOutputs(plan).includes(row)),expectedBytes:plan.expectedBytes})),runtimeParity:false,moduleStartupEquivalent:false})+'\n';}
