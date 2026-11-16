// Complete native-selected source substitutions; no retained source/result cache.
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {prepareNativeSourceBindingBatch} from './prepare-native-source-binding-batch.mjs';
import {prepareSourcePhaseTransports} from './prepare-source-phase-transports.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/invocation-cst-reuse/complete-originals.json.gz';
const PIN='fe234608c3cf30c3d4893cb92dc8185b2490a80534bc57d45362c33fe360024f';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Invocation CST reuse: '+message);};
function one(rows,label){if(rows.length!==1)fail('one actual native '+label+' required');return rows[0];}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function apply(source,rows){let after=source,end=source.length+1;for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>end||after.slice(...row.span)!==row.expected)fail('exact native source span differs');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);end=row.span[0];}return after;}
function restore(source,rows){let offset=0;const inverse=[...rows].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const start=row.span[0]+offset;offset+=row.replacement.length-row.expected.length;return {span:[start,start+row.replacement.length],expected:row.replacement,replacement:row.expected};});return apply(source,inverse);}
function select(ts,path,source,ownerName,replacements){
 const file=grammar(ts,path,source),owners=[];function owner(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===ownerName)owners.push(node);ts.forEachChild(node,owner);}owner(file);const fn=one(owners,'complete '+ownerName),nodes=[];function walk(node){nodes.push(node);ts.forEachChild(node,walk);}walk(fn);
 const edits=replacements.map(([expected,replacement])=>{const node=one(nodes.filter(node=>node.getText(file)===expected),expected);return {span:[node.getStart(file),node.end],expected,replacement,nativeKind:ts.SyntaxKind[node.kind]};});return {edits,owner:{name:ownerName,span:[fn.getStart(file),fn.end],source:fn.getText(file)}};
}
function languageChanges(helper){return helper?[
 ['document=first.document','document=first.document,transported=first'],
 ['operations.serialize(document)','transported.meta'],
 ["operations.transport(beforeMeta,'Rust',true)",'transported'],
 ["operations.transport(afterMeta,'Rust',true)",'operations.source(run.value.source,row.language)'],
 ["operations.transport(inverseMeta,'Rust',true)",'operations.source(inverse.value.source,row.language)'],
 ['document=last.document;','document=last.document;transported=last;'],
 ]:[
 ['document=first.document','document=first.document,transported=first'],
 ['serializeConcreteSyntaxMeta(document)','transported.meta'],
 ['transportConcreteSyntaxMeta(beforeMeta)','transported'],
 ['transportConcreteSyntaxMeta(afterMeta)',"transportConcreteSyntaxSource(run.value.source,{language:'JavaScript'})"],
 ["if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==from)fail('complete phase source inverse differs');","const inverseMeta=serializeConcreteSyntaxMeta(inverse.value),restored=transportConcreteSyntaxSource(inverse.value.source,{language:'JavaScript'});if(restored.source!==from)fail('complete phase source inverse differs');"],
 ['document=last.document;','document=last.document;transported=last;'],
 ];}
// Identical serialize expressions occur both before each phase and at return.
// Select both native expressions explicitly, retaining their complete census.
function expandRepeated(ts,path,source,ownerName,changes){
 const repeated=changes.find(row=>row[0]===(ownerName==='whole'?'serializeConcreteSyntaxMeta(document)':'operations.serialize(document)'));
 const rest=changes.filter(row=>row!==repeated),selected=select(ts,path,source,ownerName,rest),file=grammar(ts,path,source),nodes=[];function visit(node){if(node.getStart(file)>=selected.owner.span[0]&&node.end<=selected.owner.span[1]&&node.getText(file)===repeated[0])nodes.push(node);ts.forEachChild(node,visit);}visit(file);if(nodes.length!==2)fail('both complete native canonical serialization expressions required');for(const node of nodes)selected.edits.push({span:[node.getStart(file),node.end],expected:repeated[0],replacement:repeated[1],nativeKind:ts.SyntaxKind[node.kind]});return selected;
}
export function prepareInvocationCstReuse({root=ROOT}={}){
 root=resolve(root);const archive=resolve(root,ARCHIVE),state=lstatSync(archive);if(!state.isFile()||state.isSymbolicLink()||state.size>1048576)fail('bounded complete archive required');const packed=readFileSync(archive);if(hash(packed)!==PIN)fail('complete original source archive differs');const packet=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));if(packet.schema!=='invocation-cst-reuse-originals-v1'||packet.files.length!==2)fail('complete original census differs');const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');const files=[];
 for(const original of packet.files){
  const {path,source:before}=original;if(!['tools/translation/prepare-whole-owner-proof-byte-candidate.mjs','tools/translation/private-concrete-substitution-batch-operations.mjs'].includes(path)||hash(before)!==original.sha256||Buffer.byteLength(before)!==original.bytes)fail('complete original input differs');const helper=path.endsWith('/private-concrete-substitution-batch-operations.mjs'),ownerName=helper?'executePrivateConcreteSubstitutionRow':'whole',languageSelection=expandRepeated(ts,path,before,ownerName,languageChanges(helper)),language=apply(before,languageSelection.edits);if(restore(language,languageSelection.edits)!==before)fail('complete language native inverse differs');
  const repositorySelection=select(ts,path,language,ownerName,helper?[
   ['last.source!==stage.expected||last.document.language!==row.language','last.source!==stage.expected||last.document.language!==row.language||last.meta!==afterMeta'],
   ['restored.source!==from||restored.meta!==beforeMeta','restored.source!==from||restored.meta!==inverseMeta||inverseMeta!==beforeMeta'],
  ]:[
   ['last.source!==to','last.source!==to||last.meta!==afterMeta'],
   ['restored.source!==from','restored.source!==from||restored.meta!==inverseMeta||inverseMeta!==beforeMeta'],
  ]),after=apply(language,repositorySelection.edits);if(restore(after,repositorySelection.edits)!==language)fail('complete repository native inverse differs');grammar(ts,path,after);const trace=createRulePipeline([{phase:'language',rules:[{id:'cst:reuse-invocation-local-reparsed-transports',apply:source=>{if(source!==before)fail('complete initial input differs');return language;}}]},{phase:'repository',rules:[{id:'router:require-complete-canonical-wire-and-inverse-equality',apply:source=>{if(source!==language)fail('complete language join differs');return after;}}]}]).run(before);if(trace.value!==after)fail('complete ordered rule output differs');
  const current=readFileSync(resolve(root,path),'utf8');let installedAfter=after,sourceHistory=null;if(current!==before&&current!==after){const history=helper?prepareSourcePhaseTransports({root}):prepareNativeSourceBindingBatch({root}),successor=one(history.files.filter(row=>row.path===path),'complete known source successor');if(successor.before!==after||successor.current!==current||(successor.installedAfter??successor.after)!==current)fail('unknown complete current source: '+path);installedAfter=successor.installedAfter??successor.after;sourceHistory=successor;}const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((row,index)=>({...row,phase:index?'repository':'language',completeInverse:row.inverse===(index?language:before)}));if(stages.some(row=>!row.completeInverse))fail('complete serialized/reparsed phase inverse differs');files.push({path,before,language,after,current,installedAfter,sourceHistory,stages,trace:trace.trace,inverse:before,nativeSelections:{language:languageSelection,repository:repositorySelection},nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),beforeSha256:hash(before),afterSha256:hash(after)});
 }
 if(!readFileSync(archive).equals(packed))fail('original archive changed');for(const row of files)if(readFileSync(resolve(root,row.path),'utf8')!==row.current)fail('complete physical source changed');return {schema:'invocation-cst-reuse-source-v1',files,originalInputs:packet.files,newAcrossInvocationCache:false,publicConcreteApisChanged:false,sourceAuthority:false,runtimeAuthority:false,performanceQualified:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--write','--check','--emit'].includes(mode))fail('use --write|--check|--emit');const plan=prepareInvocationCstReuse();if(mode==='--write')for(const row of plan.files){if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('current source changed before write');writeFileSync(resolve(ROOT,row.path),row.installedAfter);}else if(mode==='--check'&&plan.files.some(row=>row.current!==row.installedAfter))fail('complete generated sources are stale');console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),performanceQualified:false}));
}
