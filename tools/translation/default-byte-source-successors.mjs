// Complete source-history DATA. These checks issue no compiler or runtime permit.
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {prepareGuardedProofLexing,assertGuardedProofLexingInputsFresh} from './prepare-guarded-proof-lexing.mjs';
import {prepareTupleDerive} from './prepare-tuple-derive.mjs';
import {prepareInvocationCstReuse} from './prepare-invocation-cst-reuse.mjs';
import {substituteWholeSourceRow} from './single-source-substitution-runtime.mjs';
const ARCHIVE='tools/translation/source-profiles/default-byte-history-extension/complete-originals.json.gz';
const PIN='722bc4ca2392dc9412b2c55b6f3422e00bc530f71bbe32b21df50abe5cb72040';
const SCOPE='tools/translation/operation-proof-byte-consumer-scope.mjs';
const RECEIVING='tools/translation/test/fixtures/current-receiving-source-history.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Default byte source history: '+message);};
function read(root,path){
 need(typeof path==='string'&&!path.startsWith('/')&&!path.split('/').includes('..'),'repository-relative source');
 const full=resolve(root,path),state=lstatSync(full);need(state.isFile()&&!state.isSymbolicLink()&&state.size<=2*1024**2,'bounded ordinary source');
 const raw=readFileSync(full),source=raw.toString('utf8');need(Buffer.from(source).equals(raw),'complete UTF8 source');
 const after=lstatSync(full);need(state.dev===after.dev&&state.ino===after.ino&&state.mode===after.mode&&state.size===after.size&&state.mtimeMs===after.mtimeMs&&state.ctimeMs===after.ctimeMs,'stable complete source');return source;
}
function optionalRead(root,path){try{return read(root,path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
export function defaultByteHistoryOriginals(root){
 const path=resolve(root,ARCHIVE),state=lstatSync(path),packed=readFileSync(path);need(state.isFile()&&!state.isSymbolicLink()&&packed.length===140243&&hash(packed)===PIN,'complete original archive');
 const original=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));need(original.schema==='default-byte-history-extension-originals-v1'&&original.files.length===3,'complete original census');
 for(const row of original.files)need(Buffer.byteLength(row.source)===row.bytes&&hash(row.source)===row.sha256,'complete archived source bytes');
 need(readFileSync(path).equals(packed),'original archive changed');return original;
}
function stages(before,after){
 const rows=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]);
 need(rows.every(row=>row.inverse===before),'whole serialized/reparsed source inverses');return rows.map((row,index)=>({...row,phase:index?'repository':'language'}));
}
export function qualifyDefaultBytePrerequisites(root,originals,names){
 const inputs=[],result=[];let guarded=null;
 for(const name of names){
  const path='tools/translation/'+name,original=originals.get(path);need(original,'complete archived prerequisite');const current=read(root,path);inputs.push({path,current});
  if(current===original.source){result.push(original);continue;}
  need(path===SCOPE,'unknown complete prerequisite successor');
  const ts=ownershipCompiler();need(ts.version==='5.9.3','installed TypeScript5.9.3');
  const file=ts.createSourceFile(path,original.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'whole original prerequisite grammar');
  const imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./original-lexing-intrinsics.mjs');need(imports.length===1,'one original lexing import');const owner=imports[0],bindings=owner.importClause?.namedBindings;
  need(bindings&&ts.isNamedImports(bindings)&&bindings.elements.length===1&&bindings.elements[0].name.text==='originalBatchedLexingIntrinsicsUnchanged'&&!bindings.elements[0].propertyName,'exact original imported binding');
  const literal=owner.moduleSpecifier,span=[literal.getStart(file),literal.end],replacement="'./guarded-proof-lexing-intrinsics.mjs'",after=original.source.slice(0,span[0])+replacement+original.source.slice(span[1]);need(after===current,'unknown complete prerequisite body');
  guarded??=prepareGuardedProofLexing({root});const target=guarded.files.find(row=>row.path==='tools/translation/guarded-proof-lexing-intrinsics.mjs');need(target?.current===target?.text&&target?.originalModuleUnchanged===true&&target?.originalGuardFunctionsRemainTopLevel===true,'complete actual guarded dependency');
  result.push({...original,source:current,bytes:Buffer.byteLength(current),sha256:hash(current),historicalSource:original.source,knownSourceHistory:{kind:'exact-guarded-import-only',nativeSelection:{span,expected:literal.getText(file),replacement},stages:stages(original.source,current),nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),current),guardedDependency:target,guardedInputs:guarded.inputs,guardedBinaryInputs:guarded.binaryInputs,sourceAuthority:false}});
 }
 if(guarded)assertGuardedProofLexingInputsFresh(guarded);
 for(const row of inputs)need(read(root,row.path)===row.current,'complete prerequisite changed');return result;
}
export function qualifyDefaultByteSourceSuccessors({root,files}){
 const result=new Map(),inputs=[];let tuple=null,invocation=null;
 for(const file of files){
  const current=optionalRead(root,file.path);inputs.push({path:file.path,current});if(current===null||current===file.after||current===file.before)continue;
  let proposal,selected;
  if(['tools/translation/builtin-debug-ast-route.mjs','tools/translation/builtin-derive-bang-footprints.mjs'].includes(file.path)){
   proposal=tuple??=prepareTupleDerive({root});need(proposal.files.every(row=>row.current===row.after),'complete tuple successor family must be installed');selected=proposal.files.find(row=>row.path===file.path);
  }else if(file.path==='tools/translation/prepare-whole-owner-proof-byte-candidate.mjs'){
   proposal=invocation??=prepareInvocationCstReuse({root});need(proposal.files.every(row=>row.current===row.installedAfter),'complete current source-substitution successor family must be installed');selected=proposal.files.find(row=>row.path===file.path);
  }else continue; // The original producer retains every original refusal below.
  need(selected&&selected.before===file.after&&selected.current===current&&(selected.installedAfter??selected.after)===current,'exact complete source successor join');
  result.set(file.path,{source:current,history:{schema:proposal.schema,selected,originalInputs:proposal.originalInputs,supportingSources:proposal.files.map(row=>({path:row.path,current:row.current,after:row.installedAfter??row.after})),sourceAuthority:false,runtimeAuthority:false}});
 }
 for(const row of inputs)need(optionalRead(root,row.path)===row.current,'complete successor inputs changed');return result;
}
export function isKnownDefaultByteReceivingPredecessor(root,path,current){
 if(path!==RECEIVING)return false;const original=defaultByteHistoryOriginals(root).files.find(row=>row.path===path);need(original,'complete prior receiving source');return original.source===current;
}
export function tryDefaultByteSourceEquation(before,language,after,sequence){
 // Keep the existing operation's complete limits and the original fallback.
 // This is an invocation-local operation, not a new parser or source cache.
 if(![before,language,after].every(source=>typeof source==='string'&&source.length<=65536))return null;
 const rule=(old,next,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:next}]}),request={source:before,language:'JavaScript',stages:[
  {phase:'language',expected:language,sequence:{languageRules:sequence.languageRules,repositoryRules:[]},inverseSequence:{languageRules:[rule(language,before,'javascript:restore-complete-original-issuer-source')],repositoryRules:[]}},
  {phase:'repository',expected:after,sequence:{languageRules:[],repositoryRules:sequence.repositoryRules},inverseSequence:{languageRules:[],repositoryRules:[rule(after,language,'router:restore-complete-original-import-and-entry')]}},
 ]};
 try{
  const received=substituteWholeSourceRow([request]);need(received.schema==='private-concrete-source-substitution-batches-v1'&&received.sourceAuthority===false&&received.runtimeAuthority===false&&received.rows.length===1,'complete existing source operation');const result=JSON.parse(received.rows[0]);
  need(result.inverse===before&&result.stages.length===2&&result.stages[0].before===before&&result.stages[0].after===language&&result.stages[1].before===language&&result.stages[1].after===after&&result.stages.every(row=>row.completeInverse===true),'complete source operation phase and inverse joins');return result;
 }catch(error){if(error instanceof TypeError)return null;throw error;}
}
