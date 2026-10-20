// Actual-source arithmetic preparation only; no owner or semantic authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),INPUT='tools/translation/private-native-proof-json.mjs',COMPOSER='tools/translation/private-frozen-json.mjs',OUTPUT='tools/translation/private-negative-budget-proof-json.mjs',CONSUMER='tools/translation/builtin-derive-bang-footprints.mjs';
const ORIGINALS={[INPUT]:'b02892e676b928339f15d2a529d0467dfd60efedbe8e991df0910400289db338',[COMPOSER]:'6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f'};
export const negativeBudgetConsumerImport={before:"import {createScopedPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';",after:"import {createScopedPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';\nimport {createNegativeBudgetPrivateProofJsonSerializer} from './private-negative-budget-proof-json.mjs';",factoryBefore:'const composeJson=createPrivateFrozenJsonComposer();',factoryAfter:'const composeJson=createNegativeBudgetPrivateProofJsonSerializer(createPrivateFrozenJsonComposer());'};
const fail=message=>{throw new TypeError('Negative proof budget source: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('unique actual source anchor required: '+before);return source.replace(before,()=>after);}
function native(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path);return file;}
function declaration(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name||ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>ts.isIdentifier(row.name)&&row.name.text===name));if(rows.length!==1)fail('complete actual declaration required: '+name);return rows[0];}
function limit(ts,file,name){const values=[];function walk(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer&&ts.isNumericLiteral(node.initializer))values.push(Number(node.initializer.text));ts.forEachChild(node,walk);}walk(file);if(values.length!==1)fail('one original numeric limit required: '+name);return values[0];}
function boundsProof(ts,source,composer){
 for(const [path,text]of [[INPUT,source],[COMPOSER,composer]])if(createHash('sha256').update(text).digest('hex')!==ORIGINALS[path])fail('complete original budget source pin differs: '+path);
 const original=native(ts,INPUT,source),fallback=native(ts,COMPOSER,composer),limits={cells:limit(ts,original,'CELLS'),depth:limit(ts,original,'DEPTH'),units:limit(ts,original,'UNITS')};
 if(limits.cells!==limit(ts,fallback,'CELLS')||limits.depth!==limit(ts,fallback,'DEPTH')||limits.units!==limit(ts,fallback,'COMPOSITION_UNITS'))fail('actual census/composer bounds differ');
 // These are exact original logical charges, not an inferred relationship
 // between unrelated quotas. Unit estimates deliberately grant no witness.
 const required=["if(depth>DEPTH)return null;","return ++cells>CELLS||kind==='string'&&value.length>COMPOSITION_UNITS?null:{kind:0,value};","if(++cells>CELLS)return null;","if(savedCells>CELLS-cells||savedHeight>DEPTH-depth)return null;cells+=savedCells;","if(costCells>CELLS-cells||costHeight>DEPTH-depth)return null;cells+=costCells;","child=inspect(field.value,depth+1,field.name,substrate&&array)"];
 const factory=declaration(ts,fallback,'createPrivateFrozenJsonComposer').getText(fallback);for(const text of required)if(factory.split(text).length!==2)fail('original complete composer logical equation changed: '+text);
 return {limits,completeComposer:composer,logicalEquations:required,unitFailureIsNotAWitness:true,unseenTailIsNotCertified:true};
}
const FACTORY=`
// NEW internal format. Only a callback-free, fresh-guarded CELLS/DEPTH
// counterexample skips the necessarily failing legacy plan/measurement. It
// certifies no unseen tail. The original dynamic root JSON call still visits
// every getter, proxy, toJSON and lazy stack, and throws the original exception.
// Legacy APIs are unchanged. Internal census/cache warming may differ here.
// All scalar records belong to the existing current synchronous retained frame.
export function createNegativeBudgetPrivateProofJsonSerializer(legacyOutsideScope=createOriginalScopedProofJsonSerializer()){
 if(typeof legacyOutsideScope!=='function')throw new TypeError('Negative budget format requires its original outside-scope serializer');
 const uncertainFallback=createPrivateFrozenJsonComposer();
 const currentCosts=createRetainedPrivateScalarCostStore();
 return function serializeNegativeBudgetProof(value){
  if(!nativeReady())return uncertainFallback(value);
  const costs=currentCosts();
  if(!costs)return legacyOutsideScope(value);
  if(!scopedFrozenQualified||!sameField(get(objectOwner,'isFrozen'),scopedFrozenField))return uncertainFallback(value);
  const witness={failed:false},frame={memo:costs.values,budget:{admissions:costs.entries}};
  let selected=false;
  try{selected=withinNegativeBudget(value,frame,witness);}catch{}
  costs.entries=frame.budget.admissions;
  if(selected)return apply(stringifyField.value,jsonOwner,[value]);
  // This lookup must stay dynamic: nativeReady pins captured ordinary owners,
  // whereas a global JSON accessor can still observe the original fallback.
  if(witness.failed)return JSON.stringify(value);
  return uncertainFallback(value);
 };
}
`;
const HISTORY='tools/translation/test/fixtures/native-proof-json-format.mjs';
function historySource(){return `
// Additive current-format history. Original comparison bodies and pins remain.
export function restoreNegativeBudgetProofConsumerSource(source,retain=()=>{}){
 if(typeof source!=='string')fail('complete negative-budget consumer source required');
 const row=${JSON.stringify(negativeBudgetConsumerImport)};
 if(!source.includes(row.after)&&!source.includes(row.factoryAfter))return source;
 const unwrapped=exact(source,row.factoryAfter,row.factoryBefore,'restore-negative-budget-factory');
 const restored=exact(unwrapped,row.after,row.before,'restore-negative-budget-import');
 const replay=exact(exact(restored,row.before,row.after,'replay-negative-budget-import'),row.factoryBefore,row.factoryAfter,'replay-negative-budget-factory');
 if(replay!==source)fail('whole negative-budget consumer inverse differs');
 retain('complete-negative-budget-consumer-history',{actualSource:source,historicalSource:restored,replayedSource:replay,rules:row,sourceAuthority:false,semanticAuthority:false});
 return restored;
}
`;}
function stage(before,after,id){return {id,edits:[{span:[0,before.length],expected:before,replacement:after}]};}
function whole(ts,root,path,original,language,after){
 native(ts,path,after);const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),first=transportConcreteSyntaxSource(original,{language:'JavaScript'}),sequence={languageRules:[stage(original,language,'javascript:actual-complete-budget-census-copy-and-negative-witness')],repositoryRules:[stage(language,after,'router:explicit-negative-budget-proof-format-selection')]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('whole serialized source differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[stage(after,original,'javascript:restore-complete-original-proof-source')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('complete inverse differs');
 let current=null;try{current=readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {path,original,language,after,current,beforeMeta:first.meta,afterMeta,sequence,trace:run.trace,inverse:original,nativeBindings};
}
export function prepareNegativeBudgetProofJson({root=ROOT}={}){
 const source=readFileSync(resolve(root,INPUT),'utf8'),composer=readFileSync(resolve(root,COMPOSER),'utf8'),consumer=readFileSync(resolve(root,CONSUMER),'utf8'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const proof=boundsProof(ts,source,composer),file=native(ts,INPUT,source),start=declaration(ts,file,'withinNativeBudget');
 // Copy the complete actual native-owner bootstrap/guards, then the complete
 // scoped census. Native spans select whole declarations, never hand-written
 // approximations of reflection, number, string or descriptor behavior.
 const prefix=source.slice(0,start.getFullStart()),census=declaration(ts,file,'withinScopedNativeBudget').getText(file),frozen=['scopedFrozenField','scopedFrozenQualified'].map(name=>declaration(ts,file,name).getText(file)).join('\n'),language=prefix+'\n'+frozen+'\n'+census+'\n';
 let after=once(language,'function withinScopedNativeBudget(value,scope){','function withinNegativeBudget(value,scope,witness){');
 after=once(after,'if(++scopeCells>CELLS||depth>DEPTH)return false;','if(++scopeCells>CELLS||depth>DEPTH){witness.failed=true;return false;}');
 after=once(after,'if(knownCells-1>CELLS-scopeCells||knownUnits>UNITS-scopeUnits||height>DEPTH-depth)return false;','if(knownCells-1>CELLS-scopeCells||height>DEPTH-depth){witness.failed=true;return false;}\n   if(knownUnits>UNITS-scopeUnits)return false;');
 after="// Generated from complete actual native census; prepare-negative-budget-proof-json.mjs owns this file.\n"+after+"\nimport {createScopedPrivateNativeProofJsonSerializer as createOriginalScopedProofJsonSerializer,createRetainedPrivateScalarCostStore} from './private-native-proof-json.mjs';\n"+FACTORY;
 const {before,after:imported,factoryBefore,factoryAfter}=negativeBudgetConsumerImport;let consumerBefore=consumer;if(consumer.includes(imported)){consumerBefore=once(consumer,imported,before);consumerBefore=once(consumerBefore,factoryAfter,factoryBefore);}const consumerAfter=once(once(consumerBefore,before,imported),factoryBefore,factoryAfter);
 const history=readFileSync(resolve(root,HISTORY),'utf8'),historyAppend=historySource(),historyCall=' source=restoreNegativeBudgetProofConsumerSource(source,retain);\n',historyAnchor='export function statelessProofConsumerSource(source,retain=()=>{}){\n';let historyBefore=history;if(history.includes(historyAppend)){historyBefore=once(history,historyAppend,'');historyBefore=once(historyBefore,historyAnchor+historyCall,historyAnchor);}const historyAfter=once(historyBefore,historyAnchor,historyAnchor+historyCall)+historyAppend;
 return {schema:'negative-budget-proof-json-source-v1',typescriptVersion:ts.version,inputs:[{path:INPUT,source},{path:COMPOSER,source:composer}],proof,files:[whole(ts,root,OUTPUT,source,language,after),whole(ts,root,CONSUMER,consumerBefore,consumerBefore,consumerAfter),whole(ts,root,HISTORY,historyBefore,historyBefore,historyAfter)],originalHelperAPIsAndBytesUnchanged:true,newAcrossInvocationCache:false,unseenTailAuthority:false,sourceAuthority:false,semanticAdmission:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('usage: prepare-negative-budget-proof-json.mjs --emit|--write|--check');const plan=prepareNegativeBudgetProofJson();if(args[0]==='--emit')console.log(JSON.stringify(plan));else if(args[0]==='--write'){for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared complete negative-budget proof sources; runtime qualification remains required.');}else{if(plan.files.some(row=>row.current!==row.after))fail('complete source proposal is stale');console.log('Negative-budget proof source equations are current.');}}
