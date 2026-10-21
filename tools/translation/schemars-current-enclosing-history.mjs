// Exact source composition only. No output/certificate or semantic authority.
import {readFileSync,existsSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareDefaultProofByteEnclosingHistory} from './prepare-default-proof-byte-adoption.mjs';
import {prepareSchemarsEnclosingAdoption} from './prepare-schemars-enclosing-adoption.mjs';
import {deriveSchemarsEnclosingImportHistory,assertSchemarsEnclosingHistoryFresh,SCHEMARS_ENCLOSING_ORIGINAL} from './schemars-enclosing-history.mjs';
import {transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const SELF='tools/translation/schemars-current-enclosing-history.mjs',PROVIDER='tools/translation/prepare-default-proof-byte-adoption.mjs',BASE='tools/translation/',PROFILE=BASE+'source-profiles/default-proof-byte-adoption/';
const TEXT=[PROVIDER,SELF,PROFILE+'default-proof-byte-operation.mjs.txt',BASE+'operation-proof-byte-bridge.mjs',BASE+'operation-proof-byte-consumer-scope.mjs',BASE+'operation-proof-byte-original-fallback.mjs'],HELPER=BASE+'default-proof-byte-operation.mjs',ARCHIVE=PROFILE+'complete-original-inputs.json.gz',BIRTH_ARCHIVE=BASE+'source-profiles/schemars-enclosing-history/originals.json.gz',LIMIT=2*1024*1024;
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Schemars current enclosing history: '+message);};
function capture(root,path,binary=false){
 const absolute=resolve(root,path),state=lstatSync(absolute);if(!state.isFile()||state.isSymbolicLink()||state.size>LIMIT)fail('bounded ordinary complete input required: '+path);const bytes=readFileSync(absolute);if(bytes.length!==state.size)fail('complete input changed while captured');
 const source=bytes.toString(binary?'base64':'utf8');if(!binary&&!Buffer.from(source).equals(bytes))fail('complete source must be lossless UTF-8');return {path,source,sha256:hash(bytes),bytes:bytes.length,...(binary?{encoding:'base64'}:{})};
}
export function assertSchemarsCurrentEnclosingHistoryFresh({root,history}){
 for(const row of [...history.physicalInputs,...history.binaryInputs]){const path=resolve(root,row.path),state=lstatSync(path);if(!state.isFile()||state.isSymbolicLink()||state.size!==row.bytes)fail('complete ordinary physical input changed: '+row.path);const bytes=readFileSync(path);if(bytes.length!==row.bytes||bytes.toString(row.encoding==='base64'?'base64':'utf8')!==row.source)fail('complete physical input changed: '+row.path);}
 for(const row of history.absentInputs)if(existsSync(resolve(root,row)))fail('previously absent helper source appeared');
}
function undo(source,edits){
 let inverse=source;for(const edit of [...edits].sort((a,b)=>a.span[0]-b.span[0])){const at=edit.span[0];if(inverse.slice(at,at+edit.replacement.length)!==edit.replacement)fail('exact native inverse span differs');inverse=inverse.slice(0,at)+edit.expected+inverse.slice(at+edit.replacement.length);}return inverse;
}
export function normalizeSchemarsCurrentEnclosingSource({root,original,source}){
 root=resolve(root);const birth=deriveSchemarsEnclosingImportHistory({original,source:original});
 if(source===birth.before||source===birth.after)return {...deriveSchemarsEnclosingImportHistory({original,source}),byteLayer:null,physicalInputs:[],binaryInputs:[],absentInputs:[]};
 // All inputs are captured before the fresh focused operation and checked
 // afterwards; no source, owner, encoded bytes or verdict survives this call.
 const physicalInputs=TEXT.map(path=>capture(root,path)),binaryInputs=[capture(root,ARCHIVE,true),capture(root,BIRTH_ARCHIVE,true)],absentInputs=[];
 if(existsSync(resolve(root,HELPER)))physicalInputs.push(capture(root,HELPER));else absentInputs.push(HELPER);
 const byteLayer=prepareDefaultProofByteEnclosingHistory({root});if(byteLayer.files.length!==1||byteLayer.historicalLayers.length!==1)fail('one complete original enclosing equation required');const row=byteLayer.files[0],predecessor=byteLayer.historicalLayers[0].files.find(row=>row.path===SCHEMARS_ENCLOSING_ORIGINAL);
 const birthArchive=byteLayer.historicalLayers[0].history.archiveInput,capturedBirth=binaryInputs.find(row=>row.path===BIRTH_ARCHIVE);if(birthArchive.path!==BIRTH_ARCHIVE||birthArchive.encoding!=='base64'||birthArchive.source!==capturedBirth.source||birthArchive.bytes!==capturedBirth.bytes||birthArchive.sha256!==capturedBirth.sha256)fail('complete captured birth archive differs from the genuine focused input');
 if(row.path!==SCHEMARS_ENCLOSING_ORIGINAL||!predecessor||predecessor.before!==birth.before||predecessor.after!==birth.after||row.before!==birth.after||source!==row.after||row.inverse!==row.before)fail('source differs from exact import then byte-wrapper equation');
 const add=input=>{const previous=physicalInputs.find(row=>row.path===input.path);if(previous){if(previous.source!==input.source)fail('complete physical input association differs');return;}const actual=capture(root,input.path);if(actual.source!==input.source)fail('focused physical input differs');physicalInputs.push(actual);};
 for(const input of byteLayer.historicalLayers[0].inputs)add(input);for(const input of byteLayer.prerequisiteInputs)add(input);add(byteLayer.fragment);add({path:row.path,source:row.current});
 const repository=undo(source,row.repositorySelections),nativeInverse=undo(repository,row.nativeSelections);if(repository!==row.language||nativeInverse!==row.before)fail('complete independent native wrapper inverse differs');
 if(row.stages.length!==2||row.stages[0].phase!=='language'||row.stages[1].phase!=='repository')fail('complete ordered two-phase source equation required');let inverse=source;const inverseStages=[];
 for(const stage of [...row.stages].reverse()){
  const before=transportConcreteSyntaxMeta(stage.beforeMeta),after=transportConcreteSyntaxMeta(stage.afterMeta);if(before.source!==stage.before||after.source!==stage.after||inverse!==stage.after)fail('complete focused CST phase source differs');
  const rule={id:'router:restore-exact-current-enclosing-'+stage.phase,edits:[{span:[0,stage.after.length],expected:stage.after,replacement:stage.before}]},sequence={languageRules:stage.phase==='language'?[rule]:[],repositoryRules:stage.phase==='repository'?[rule]:[]},run=applyConcreteSyntaxSubstitutions(after.document,sequence),wire=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(wire);if(parsed.source!==stage.before)fail('complete serialized/reparsed wrapper inverse differs');inverseStages.push({phase:stage.phase,before:stage.after,after:stage.before,beforeMeta:stage.afterMeta,afterMeta:wire,sequence,trace:run.trace});inverse=parsed.source;
 }
 if(inverse!==nativeInverse)fail('complete native and CST wrapper inverses disagree');const imported=deriveSchemarsEnclosingImportHistory({original,source:inverse});if(imported.restored!==original)fail('complete import then wrapper inverse differs');
 const history={...imported,current:source,physicalCurrent:row.current,byteLayer,byteNativeInverse:{repository,language:nativeInverse},byteInverseStages:inverseStages,physicalInputs,binaryInputs,absentInputs,wholeInverse:imported.restored,sourceAuthority:false,runtimeAuthority:false};assertSchemarsCurrentEnclosingHistoryFresh({root,history});return history;
}

// Separate current composer: the birth producer remains usable as the focused
// byte producer's predecessor and never recursively normalizes its own inputs.
export function prepareCurrentSchemarsEnclosingAdoption({root}){
 root=resolve(root);const birth=prepareSchemarsEnclosingAdoption({root}),row=birth.files.find(row=>row.path===SCHEMARS_ENCLOSING_ORIGINAL);if(!row)fail('complete enclosing birth row required');const history=normalizeSchemarsCurrentEnclosingSource({root,original:row.before,source:row.current});
 for(const input of birth.inputs)if(readFileSync(resolve(root,input.path),'utf8')!==input.source)fail('complete current adoption input changed');assertSchemarsCurrentEnclosingHistoryFresh({root,history});assertSchemarsEnclosingHistoryFresh({root,history:birth.history});return {schema:'complete-current-schemars-enclosing-adoption-v1',birth,history,enclosingLayers:[row,...(history.byteLayer?history.byteLayer.files:[])],physicalCurrent:row.current,wholeInverse:history.restored,knownCurrentEnclosingSource:true,defaultInstalled:false,sourceAuthority:false,runtimeAuthority:false,performanceQualified:false};
}
