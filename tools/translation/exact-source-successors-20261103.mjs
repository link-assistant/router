// Fixed reviewed repository histories. Returns CST/source proposals, never owners.
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {lstatSync,realpathSync} from 'node:fs';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {parseOrderedMapSourceData} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {composeExactSourceSuccessorData} from './exact-source-successor-data-20261103.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json';
const INDEX_SHA256='2aadf095e79e994c34a089524c0f13a877dd79c5606b08dd33ea5dd88904c299';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),fail=message=>{throw TypeError('Fixed exact source successors: '+message);};
let active=null,operationDepth=0,retainedSourceBytes=0;
function retain(frame,bytes){if(!Number.isSafeInteger(bytes)||bytes<0||retainedSourceBytes+bytes>16777216)fail('aggregate invocation-local source DATA retention bound');retainedSourceBytes+=bytes;frame.retainedBytes+=bytes;}
function fixedPath(path){return typeof path==='string'&&path.length<=4096&&!/[\x00-\x1f\x7f\\:]/u.test(path)&&!path.startsWith('/')&&!path.split('/').some(part=>!part||part==='.'||part==='..');}
function text(raw){const value=raw.toString('utf8');if(!Buffer.from(value).equals(raw))fail('whole strict UTF8 source required');return value;}
function read(frame,path,maximum){
 const stored=path!==INDEX?captureReadonlySourceProfile(join(frame.root,path),{maximum}):null;if(stored){const source=text(stored.bytes),old=frame.snapshots.get(path);if(old){if(!old.stored||old.source!==source)fail('actual logical source snapshot changed');old.stored.requireCurrent();}else{retain(frame,stored.bytes.length);frame.snapshots.set(path,{source,stored});}return source;}const actual=join(frame.root,path),stat=lstatSync(actual,{bigint:true}),raw=frame.custody.readBytes(actual,maximum),source=text(raw),old=frame.snapshots.get(path);
 if(!sameCompactPhysicalSourceStamp(stat,lstatSync(actual,{bigint:true}))||old&&(!sameCompactPhysicalSourceStamp(old.stat,stat)||old.source!==source))fail('actual whole source snapshot changed');
 if(!old){retain(frame,raw.length);frame.snapshots.set(path,{path:actual,stat,source});}return source;
}
function close(frame){return withSourceInputValidation(()=>withCompleteSourceClosingFence(()=>null,[
 ...[...frame.snapshots.values()].map(row=>()=>{if(row.stored)row.stored.requireCurrent();else if(!readCompactSparsePhysicalFile(row).equals(Buffer.from(row.source)))fail('complete closing source bytes differ');}),
 frame.custody.close,
]));}
function sourceIndex(frame){
 if(frame.index)return frame.index;
 const source=read(frame,INDEX,1048576);if(hash(source)!==INDEX_SHA256)fail('complete fixed reviewed source index differs');
 const value=parseOrderedMapSourceData(source);if(value.schema!=='fixed-reviewed-source-successor-index-20261103-v1'||!Array.isArray(value.rows)||value.rows.length!==333||new Set(value.rows.map(row=>row.id)).size!==333)fail('complete fixed source-index census differs');
 for(const row of value.rows){if(!fixedPath(row.path)||!['JavaScript','TypeScript','Rust'].includes(row.language))fail('fixed original source path/language required');for(const side of ['before','after']){const image=row[side];if(!image||!fixedPath(image.path)||!image.path.startsWith('tools/translation/source-profiles/')||!Number.isSafeInteger(image.bytes)||image.bytes<0||image.bytes>4194304||!/^[a-f0-9]{64}$/u.test(image.sha256))fail('complete fixed original source image required');}}
 retain(frame,Buffer.byteLength(source));frame.index=value;return value;
}
function image(frame,row){
 const old=frame.images.get(row.path);if(old){if(old.bytes!==row.bytes||old.sha256!==row.sha256)fail('conflicting full source image identity');return old.source;}
 const source=read(frame,row.path,4194304);if(Buffer.byteLength(source)!==row.bytes||hash(source)!==row.sha256)fail('whole original source image differs');
 frame.images.set(row.path,{bytes:row.bytes,sha256:row.sha256,source});return source;
}
/** Invocation-local source/index DATA can be shared; no private frame escapes. */
export function withExactSourceHistoryDataOperation(root,run){
 requireSynchronousSourceCallback(run);root=realpathSync(resolve(root));
 if(operationDepth>=64)fail('complete source-history operation depth bound');operationDepth++;
 try{
  if(active?.root===root)return withSourceFailureOperation(()=>withCompleteSourceClosingFence(run,[]));
  const parent=active,frame={root,custody:createOrderedMapCanonicalSourceCustody(root),index:null,images:new Map(),snapshots:new Map(),retainedBytes:0,parent};active=frame;
  try{return withSourceFailureOperation(()=>withCompleteSourceClosingFence(run,[()=>close(frame)]));}
  finally{active=parent;retainedSourceBytes-=frame.retainedBytes;frame.retainedBytes=0;frame.index=null;frame.images.clear();frame.snapshots.clear();}
 }finally{operationDepth--;}
}
function operate(root,run){root=realpathSync(resolve(root));return active?.root===root?withSourceFailureOperation(()=>withSourceInputValidation(()=>run(active))):withExactSourceHistoryDataOperation(root,()=>withSourceInputValidation(()=>run(active)));}
function prepare(input,root,known){
 account(input);input=copyMetadata(input);if(!input||Object.keys(input).sort().join(',')!=='before,path'||typeof input.path!=='string'||typeof input.before!=='string')fail('exact path and complete original source DATA required');
 return operate(root,frame=>{
  const rows=sourceIndex(frame).rows.filter(row=>row.path===input.path);if(!rows.length)return null;
  const current=read(frame,input.path,4194304);
  const edges=rows.map(row=>({id:row.id,language:row.language,before:image(frame,row.before),after:image(frame,row.after)}));
  const selected=composeExactSourceSuccessorData({path:input.path,before:input.before,current,edges});if(!selected||known&&!selected.currentIsTerminal)return null;
  const stages=selected.chain.map((edge,at)=>{
   const result=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('repository:exact-reviewed-source-edge-'+at,edge.before,edge.after,1,'whole reviewed source predecessor differs')]}]).run(edge.before);
   if(result.value!==edge.after)fail('complete literal source successor differs');const history=transportConcreteSourceEquations([{before:edge.before,after:edge.after,language:edge.language}])[0];if(history.inverse!==edge.before)fail('complete source edge inverse differs');
   return {ids:edge.ids,before:edge.before,after:edge.after,inverse:edge.before,history,trace:result.trace};
  });
  const history=transportConcreteSourceEquations([{before:selected.before,after:selected.after,language:selected.language}])[0];if(history.inverse!==selected.before)fail('complete composed source inverse differs');
  const result={...selected,stages,history,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false};boundedReconcileWireBytes(result);return result;
 });
}
/** A prepared target may be newer than physical source; the original consumer
 * must still check every original/current/native binding before installation. */
export function prepareExactSourceSuccessor(input,{root=ROOT}={}){return prepare(input,root,false);}
/** Current means the complete physical terminal afterimage, not a prefix/hash. */
export function knownExactSourceSuccessor(input,{root=ROOT}={}){return prepare(input,root,true);}

/** Charge caller-retained whole source bytes to the SAME invocation DATA cap.
 * A reservation is a restriction, never source/type/body/mutation permission. */
export function withExactSourceHistoryDataReservation(bytes,run){
 requireSynchronousSourceCallback(run);withSourceInputValidation(()=>{if(!active||!Number.isSafeInteger(bytes)||bytes<0||retainedSourceBytes+bytes>16777216)fail('active complete source-history byte reservation required');retainedSourceBytes+=bytes;});
 try{return withCompleteSourceClosingFence(run,[]);}finally{retainedSourceBytes-=bytes;}
}
