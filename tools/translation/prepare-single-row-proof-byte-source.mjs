// Share the existing authenticated rule operation; retain independent source
// transports and the complete original fallback. No new runtime engine/cache.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/single-row-proof-byte/complete-originals.json.gz',PIN='caba3659f3c11eb1edbcf780934654f8d101f9e09ff15e4ff20058105764189b',TARGET='tools/translation/prepare-whole-owner-proof-byte-candidate.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Single source rule operation: '+message);};
function one(rows,label){if(rows.length!==1)fail('one exact native '+label+' required');return rows[0];}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;}
function rewrite(source,edits){let after=source,end=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>end||after.slice(...row.span)!==row.expected)fail('complete native span differs');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);end=row.span[0];}let delta=0;const mapped=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const start=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;return {...row,span:[start,start+row.replacement.length]};});let back=after;for(const row of mapped.reverse()){if(back.slice(...row.span)!==row.replacement)fail('complete inverse span differs');back=back.slice(0,row.span[0])+row.expected+back.slice(row.span[1]);}if(back!==source)fail('complete native inverse differs');return after;}
function wholeChanges(ts,path,before){
 const file=parse(ts,path,before),entry=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareWholeOwnerProofByteCandidate'),'complete producer'),whole=one(entry.body.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='whole'),'complete source row'),phase=one(whole.body.statements.filter(ts.isForOfStatement),'original phase loop');if(phase.expression.getText(file)!=="['language','repository']")fail('original phase order differs');const declarations=phase.statement.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]),named=name=>one(declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name),'phase '+name),from=named('from'),to=named('to'),run=named('run'),inverse=named('inverse');if(run.initializer.expression.getText(file)!=='applyConcreteSyntaxSubstitutions'||inverse.initializer.expression.getText(file)!=='applyConcreteSyntaxSubstitutions')fail('complete original rule calls required');
 const reserved=new Set(['substituteWholeSourceRow','wholeSourceFragment','wholeSourceTransports','wholeMeta0','wholeMeta1','wholeMeta2','wholeWireBound']);function collision(node){if(ts.isIdentifier(node)&&reserved.has(node.text))fail('new operation binding captures an original identifier');ts.forEachChild(node,collision);}collision(file);
 const request="(()=>{const stages=[];for(const phase of "+phase.expression.getText(file)+"){const "+from.getText(file)+','+to.getText(file)+";stages.push({phase,expected:to,sequence:"+run.initializer.arguments[1].getText(file)+",inverseSequence:"+inverse.initializer.arguments[1].getText(file)+"});}return {source:before,language:'JavaScript',stages};})()";
 const prefix=`let wholeSourceFragment=null;
 const wholeSourceTransports=first.completePhaseTransports,wholeMeta0=wholeSourceTransports[0].meta.length,wholeMeta1=wholeSourceTransports[1].meta.length,wholeMeta2=wholeSourceTransports[2].meta.length;
 // Canonical JSON text needs at most twice its units when JSON-quoted; raw
 // sources need at most six. Three bytes per unit bounds complete UTF8.
 const wholeWireBound=4*(wholeMeta0+wholeMeta1+wholeMeta2)+6*(2*before.length+2*language.length+after.length)+4096;
 if(2*wholeMeta0+3*wholeMeta1+wholeMeta2<=33554432&&3*wholeWireBound<=33554432){
  const requested=${request},received=substituteWholeSourceRow([requested]);
  if(received.schema!=='private-concrete-source-substitution-batches-v1'||received.sourceAuthority!==false||received.runtimeAuthority!==false||received.rows.length!==1||typeof received.rows[0]!=='string')fail('complete single source operation differs');
  const fragment=JSON.parse(received.rows[0]);
  if(JSON.stringify(Object.keys(fragment))!==JSON.stringify(['beforeMeta','afterMeta','inverse','stages','trace'])||fragment.beforeMeta!==wholeSourceTransports[0].meta||fragment.afterMeta!==wholeSourceTransports[2].meta||fragment.inverse!==before||fragment.stages.length!==2)fail('complete independent source/CST join differs');
  for(let index=0;index<2;index++){
   const stage=fragment.stages[index],input=wholeSourceTransports[index],output=wholeSourceTransports[index+1];
   if(JSON.stringify(Object.keys(stage))!==JSON.stringify(['phase','before','after','beforeMeta','afterMeta','trace','completeInverse'])||stage.phase!==(index?'repository':'language')||stage.before!==input.source||stage.after!==output.source||stage.beforeMeta!==input.meta||stage.afterMeta!==output.meta||stage.completeInverse!==true)fail('complete independent phase/inverse join differs');
  }
  if(JSON.stringify(fragment.trace.map(stage=>stage.phase))!==JSON.stringify(['language','repository','language','repository'])||JSON.stringify(fragment.trace.flatMap(stage=>stage.rules.map(rule=>rule.id)))!==JSON.stringify([...sequence.languageRules,...sequence.repositoryRules].map(rule=>rule.id)))fail('complete actual original rule trace differs');
  wholeSourceFragment=fragment;
 }
 `;
 const skip="\n   if(wholeSourceFragment){const index=phase==='language'?0:1;stages.push(wholeSourceFragment.stages[index]);document=wholeSourceTransports[index+1].document;transported=wholeSourceTransports[index+1];continue;}\n";
 const edits=[{span:[0,0],expected:'',replacement:"import {substituteWholeSourceRow} from './single-source-substitution-runtime.mjs';\n"},{span:[phase.getStart(file),phase.getStart(file)],expected:'',replacement:prefix},{span:[phase.statement.getStart(file)+1,phase.statement.getStart(file)+1],expected:'',replacement:skip}];return {edits,previousAfter:rewrite(before,[{...edits[0],replacement:"import {substitutePrivateConcreteSourceBatches as substituteWholeSourceRow} from './private-concrete-substitution-batch-candidate.mjs';\n"},...edits.slice(1)]),request,legacyPhaseSource:phase.getText(file),independentCompleteSourceTransports:true,originalFallbackRetained:true};
}
export function prepareSingleRowProofByteSource({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));if(packed.length!==7855||hash(packed)!==PIN)fail('complete original archive differs');const original=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));if(original.schema!=='single-row-proof-byte-originals-v1'||original.files.length!==2)fail('complete source census differs');const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');const files=[];
 for(const input of original.files){
  const {path,source:before}=input;if(hash(before)!==input.sha256||Buffer.byteLength(before)!==input.bytes)fail('complete original bytes differ');let selection;
  if(path===TARGET)selection=wholeChanges(ts,path,before);else{
   const file=parse(ts,path,before),entry=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareSourcePhaseTransports'),'complete phase producer'),nodes=[];function visit(node){nodes.push(node);ts.forEachChild(node,visit);}visit(entry);const after=one(nodes.filter(node=>ts.isVariableDeclaration(node)&&node.name.getText(file)==='after'),'complete current output');selection={edits:[{span:[0,0],expected:'',replacement:"import {knownSingleRowProofByteSuccessor} from './prepare-single-row-proof-byte-source.mjs';\n"},{span:[after.initializer.getStart(file),after.initializer.end],expected:after.initializer.getText(file),replacement:'knownSingleRowProofByteSuccessor({root,path,source:'+after.initializer.getText(file)+',original:before,previous:[previousAfter,priorAfter]})'}]};
  }
  const after=rewrite(before,selection.edits),current=readFileSync(resolve(root,path),'utf8');if(current!==before&&current!==after&&current!==selection.previousAfter)fail('unknown complete physical source: '+path);parse(ts,path,after);const run=createRulePipeline([{phase:'language',rules:[{id:'javascript:retain-original-source-rules-and-complete-fallback',apply:source=>{if(source!==before)fail('complete original differs');return before;}}]},{phase:'repository',rules:[{id:'router:share-one-bounded-source-operation-with-independent-cst-joins',apply:source=>rewrite(source,selection.edits)}]}]).run(before),stages=transportConcreteSourceEquations([{before,after:before,language:'JavaScript'},{before,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language',completeInverse:stage.inverse===before}));if(stages.some(stage=>!stage.completeInverse))fail('complete serialized/reparsed inverse differs');files.push({path,before,language:before,after,current,inverse:before,stages,trace:run.trace,nativeSelections:selection,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after)});
 }
 if(!readFileSync(resolve(root,ARCHIVE)).equals(packed))fail('complete source archive changed');for(const row of files)if(readFileSync(resolve(root,row.path),'utf8')!==row.current)fail('complete physical source changed');return {schema:'single-row-proof-byte-source-v1',files,originalInputs:original.files,newAcrossInvocationCache:false,originalLimitsChanged:false,originalFallbackRetained:true,independentCompleteSourceComparisons:true,performanceQualified:false,sourceAuthority:false,runtimeAuthority:false};
}
export function knownSingleRowProofByteSuccessor({root,path,source,original,previous}){
 if(path!==TARGET)return source;const current=readFileSync(resolve(root,path),'utf8');if(current===source||current===original||previous.includes(current))return source;const proposal=prepareSingleRowProofByteSource({root}),row=one(proposal.files.filter(row=>row.path===path),'complete known successor');if(row.before!==source||row.after!==current||row.current!==current)fail('unknown complete current successor');return row.after;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--check','--write'].includes(mode))fail('use --emit|--check|--write');const plan=prepareSingleRowProofByteSource();if(mode==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);else if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete generated source is stale');console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
