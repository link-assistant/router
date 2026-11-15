// Actual-source arithmetic preparation only; no owner or semantic authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {deriveGuardedProofLexingConsumerSource} from './prepare-guarded-proof-lexing.mjs';
import {deriveCompilerAliasSourceEvolution} from './compiler-alias-source-evolution.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),INPUT='tools/translation/private-native-proof-json.mjs',COMPOSER='tools/translation/private-frozen-json.mjs',OUTPUT='tools/translation/private-negative-budget-proof-json.mjs',CONSUMER='tools/translation/builtin-derive-bang-footprints.mjs';
const ORIGINAL_NATIVE='b02892e676b928339f15d2a529d0467dfd60efedbe8e991df0910400289db338';
const ORIGINALS={[INPUT]:'f23c8f96cddf92af07495e67622fd98d8b9bcf04b9ed62a78693ee7455ba027b',[COMPOSER]:'6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f'};
export const negativeBudgetConsumerImport={before:"import {createScopedPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';",after:"import {createScopedPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';\nimport {createNegativeBudgetPrivateProofJsonSerializer} from './private-negative-budget-proof-json.mjs';",factoryBefore:'const composeJson=createPrivateFrozenJsonComposer();',factoryAfter:'const composeJson=createNegativeBudgetPrivateProofJsonSerializer(createPrivateFrozenJsonComposer());'};
export const negativeBudgetCurrentConsumerImport={...negativeBudgetConsumerImport,before:negativeBudgetConsumerImport.before.replace("'./private-native-proof-json.mjs'",'"./operation-proof-byte-bridge.mjs"'),after:negativeBudgetConsumerImport.after.replace("'./private-native-proof-json.mjs'",'"./operation-proof-byte-bridge.mjs"')};
const fail=message=>{throw new TypeError('Negative proof budget source: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('unique actual source anchor required: '+before);return source.replace(before,()=>after);}
function native(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path);return file;}
function declaration(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name||ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>ts.isIdentifier(row.name)&&row.name.text===name));if(rows.length!==1)fail('complete actual declaration required: '+name);return rows[0];}
function limit(ts,file,name){const values=[];function walk(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&node.initializer&&ts.isNumericLiteral(node.initializer))values.push(Number(node.initializer.text));ts.forEachChild(node,walk);}walk(file);if(values.length!==1)fail('one original numeric limit required: '+name);return values[0];}
function nativeInputEvolution(ts,root,source,file){
 const sourceHistory=deriveGuardedProofLexingConsumerSource(source,INPUT),actual=source;
 source=sourceHistory.source;file=native(ts,INPUT,source);
 const added=declaration(ts,file,'privateNativeProofJsonDataWithinBudget');
 if(!ts.isFunctionDeclaration(added)||!added.modifiers?.some(row=>row.kind===ts.SyntaxKind.ExportKeyword)||added.parameters.length!==1||!ts.isIdentifier(added.parameters[0].name)||added.parameters[0].name.text!=='value')fail('one actual additive stateless eligibility export required');
 // Native fullStart includes only this declaration's original leading trivia.
 // The complete inverse must equal the original whole helper, not just its
 // selected prefix/census; unrelated edits and missing old APIs still refuse.
 const span=[added.getFullStart(),added.end],historical=source.slice(0,span[0])+source.slice(span[1]);
 if(createHash('sha256').update(historical).digest('hex')!==ORIGINAL_NATIVE)fail('additive native declaration does not restore complete original input');
 const row=whole(ts,root,INPUT,historical,source,actual);if(row.current!==actual)fail('complete actual native input changed during preparation');
 return {...row,historicalSha256:ORIGINAL_NATIVE,additiveSha256:ORIGINALS[INPUT],actualSha256:createHash('sha256').update(actual).digest('hex'),sourceHistory,addedDeclaration:{kind:'FunctionDeclaration',name:added.name.text,span,source:source.slice(...span)},allOriginalBytesAndAPIsPreserved:true};
}
function boundsProof(ts,root,source,composer){
 const sourceHistories=[];
 for(const [path,text]of [[INPUT,source],[COMPOSER,composer]]){
  const history=deriveGuardedProofLexingConsumerSource(text,path);
  if(createHash('sha256').update(history.source).digest('hex')!==ORIGINALS[path])fail('complete original budget source pin differs: '+path);
  if(history.text!==text)fail('complete current guarded budget source required: '+path);
  sourceHistories.push(history);
 }
 const original=native(ts,INPUT,source),fallback=native(ts,COMPOSER,composer),limits={cells:limit(ts,original,'CELLS'),depth:limit(ts,original,'DEPTH'),units:limit(ts,original,'UNITS')};
 if(limits.cells!==limit(ts,fallback,'CELLS')||limits.depth!==limit(ts,fallback,'DEPTH')||limits.units!==limit(ts,fallback,'COMPOSITION_UNITS'))fail('actual census/composer bounds differ');
 // These are exact original logical charges, not an inferred relationship
 // between unrelated quotas. Unit estimates deliberately grant no witness.
 const required=["if(depth>DEPTH)return null;","return ++cells>CELLS||kind==='string'&&value.length>COMPOSITION_UNITS?null:{kind:0,value};","if(++cells>CELLS)return null;","if(savedCells>CELLS-cells||savedHeight>DEPTH-depth)return null;cells+=savedCells;","if(costCells>CELLS-cells||costHeight>DEPTH-depth)return null;cells+=costCells;","child=inspect(field.value,depth+1,field.name,substrate&&array)"];
 const factory=declaration(ts,fallback,'createPrivateFrozenJsonComposer').getText(fallback);for(const text of required)if(factory.split(text).length!==2)fail('original complete composer logical equation changed: '+text);
 return {limits,completeComposer:composer,sourceHistories,logicalEquations:required,nativeInputEvolution:nativeInputEvolution(ts,root,source,original),unitFailureIsNotAWitness:true,unseenTailIsNotCertified:true};
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
function currentHistorySource(){return `
// The later operation-byte bridge keeps its complete original default call.
export function restoreCurrentNegativeBudgetProofConsumerSource(source,retain=()=>{}){
 if(typeof source!=='string')fail('complete current negative-budget consumer source required');
 const row=${JSON.stringify(negativeBudgetCurrentConsumerImport)};
 if(!source.includes(row.after))return restoreNegativeBudgetProofConsumerSource(source,retain);
 const unwrapped=exact(source,row.factoryAfter,row.factoryBefore,'restore-current-negative-budget-factory');
 const restored=exact(unwrapped,row.after,row.before,'restore-current-negative-budget-import');
 const replay=exact(exact(restored,row.before,row.after,'replay-current-negative-budget-import'),row.factoryBefore,row.factoryAfter,'replay-current-negative-budget-factory');
 if(replay!==source)fail('whole current negative-budget consumer inverse differs');
 retain('complete-current-negative-budget-consumer-history',{actualSource:source,historicalSource:restored,replayedSource:replay,rules:row,sourceAuthority:false,semanticAuthority:false});
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
 const source=readFileSync(resolve(root,INPUT),'utf8'),composer=readFileSync(resolve(root,COMPOSER),'utf8'),consumer=readFileSync(resolve(root,CONSUMER),'utf8'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const proof=boundsProof(ts,root,source,composer),file=native(ts,INPUT,source),start=declaration(ts,file,'withinNativeBudget');
 // Copy the complete actual native-owner bootstrap/guards, then the complete
 // scoped census. Native spans select whole declarations, never hand-written
 // approximations of reflection, number, string or descriptor behavior.
 const prefix=source.slice(0,start.getFullStart()),census=declaration(ts,file,'withinScopedNativeBudget').getText(file),frozen=['scopedFrozenField','scopedFrozenQualified'].map(name=>declaration(ts,file,name).getText(file)).join('\n'),language=prefix+'\n'+frozen+'\n'+census+'\n';
 let after=once(language,'function withinScopedNativeBudget(value,scope){','function withinNegativeBudget(value,scope,witness){');
 after=once(after,'if(++scopeCells>CELLS||depth>DEPTH)return false;','if(++scopeCells>CELLS||depth>DEPTH){witness.failed=true;return false;}');
 after=once(after,'if(knownCells-1>CELLS-scopeCells||knownUnits>UNITS-scopeUnits||height>DEPTH-depth)return false;','if(knownCells-1>CELLS-scopeCells||height>DEPTH-depth){witness.failed=true;return false;}\n   if(knownUnits>UNITS-scopeUnits)return false;');
 after="// Generated from complete actual native census; prepare-negative-budget-proof-json.mjs owns this file.\n"+after+"\nimport {createScopedPrivateNativeProofJsonSerializer as createOriginalScopedProofJsonSerializer,createRetainedPrivateScalarCostStore} from './private-native-proof-json.mjs';\n"+FACTORY;
 const {before,after:imported,factoryBefore,factoryAfter}=negativeBudgetCurrentConsumerImport;let consumerBefore=consumer;if(consumer.includes(imported)){consumerBefore=once(consumer,imported,before);consumerBefore=once(consumerBefore,factoryAfter,factoryBefore);}
 const consumerSourceHistory=deriveCompilerAliasSourceEvolution(consumerBefore,'builtin-derive-bang-footprints.mjs');if(!consumerSourceHistory||consumerSourceHistory.current!==consumerBefore)fail('complete current operation-byte bridge source required');
 const consumerAfter=once(once(consumerBefore,before,imported),factoryBefore,factoryAfter);
 const history=readFileSync(resolve(root,HISTORY),'utf8'),legacyAppend=historySource(),currentAppend=currentHistorySource(),historyCall=' source=restoreNegativeBudgetProofConsumerSource(source,retain);\n',currentCall=' source=restoreCurrentNegativeBudgetProofConsumerSource(source,retain);\n',historyAnchor='export function statelessProofConsumerSource(source,retain=()=>{}){\n';let historyBefore=history;
 if(historyBefore.includes(currentAppend)){historyBefore=once(historyBefore,currentAppend,'');historyBefore=once(historyBefore,currentCall,'');}
 if(historyBefore.includes(legacyAppend)){historyBefore=once(historyBefore,legacyAppend,'');historyBefore=once(historyBefore,historyAnchor+historyCall,historyAnchor);}
 const historyAfter=once(historyBefore,historyAnchor,historyAnchor+currentCall+historyCall)+legacyAppend+currentAppend;
 const files=[whole(ts,root,OUTPUT,source,language,after),whole(ts,root,CONSUMER,consumerBefore,consumerBefore,consumerAfter),whole(ts,root,HISTORY,historyBefore,historyBefore,historyAfter)];
 // Keep the complete opt-in source proposal reviewable, but do not install an
 // unqualified production default. --write also restores a prior trial through
 // the exact whole inverse already checked above; candidate code stays shipped.
 for(const row of files){row.candidateOnly=row.path===CONSUMER;row.installationSource=row.candidateOnly?row.original:row.after;}
 return {schema:'negative-budget-proof-json-source-v1',typescriptVersion:ts.version,inputs:[{path:INPUT,source},{path:COMPOSER,source:composer}],proof,consumerSourceHistory,files,candidateOnly:true,productionDefaultSelected:consumer===consumerAfter,productionInstallationApproved:false,originalHelperAPIsAndBytesUnchanged:true,newAcrossInvocationCache:false,unseenTailAuthority:false,sourceAuthority:false,semanticAdmission:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('usage: prepare-negative-budget-proof-json.mjs --emit|--write|--check');const plan=prepareNegativeBudgetProofJson();if(args[0]==='--emit')console.log(JSON.stringify(plan));else if(args[0]==='--write'){for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.installationSource);console.log('Prepared explicit negative-budget candidate; original production serializer remains selected.');}else{if(plan.files.some(row=>row.current!==row.installationSource))fail('complete candidate source or original production selection is stale');console.log('Negative-budget candidate source equations and original production selection are current.');}}

// Compose the later complete receiving layer without rerunning the unrelated
// census/consumer proposal. The original producer and its equations stay exact.
export function deriveCurrentNegativeBudgetProofHistory(source,{root=ROOT}={}){
 if(typeof source!=='string')fail('complete receiving history source required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const file=native(ts,HISTORY,source),owner=declaration(ts,file,'statelessProofConsumerSource');
 const legacy=historySource(),append=currentHistorySource();
 if(source.split(legacy).length!==2||source.includes('function restoreCurrentNegativeBudgetProofConsumerSource('))fail('one complete preceding negative-budget history required');
 const first=owner.body?.statements[0];
 if(!first||first.getText(file)!=='source=restoreNegativeBudgetProofConsumerSource(source,retain);')fail('actual original first history call required');
 const insertion='source=restoreCurrentNegativeBudgetProofConsumerSource(source,retain);\n ',at=first.getStart(file);
 const language=source.slice(0,at)+insertion+source.slice(at),after=language+append;
 const result=whole(ts,root,HISTORY,source,language,after);
 if(transportConcreteSyntaxMeta(result.beforeMeta).source!==source)fail('complete original history reparse differs');
 const output=native(ts,HISTORY,transportConcreteSyntaxMeta(result.afterMeta).source),added=declaration(ts,output,'restoreCurrentNegativeBudgetProofConsumerSource');
 if(!ts.isFunctionDeclaration(added)||after.slice(0,-append.length)!==language||language.slice(0,at)+language.slice(at+insertion.length)!==source)fail('complete receiving append/call inverse differs');
 const originalDeclarations=file.statements.map(node=>node.getText(file));
 const restored=after.slice(0,-append.length),inverse=restored.slice(0,at)+restored.slice(at+insertion.length);
 if(inverse!==source)fail('complete receiving inverse differs');
 return {...result,nativeSelections:[{span:[at,at],expected:'',replacement:insertion,owner:owner.getText(file)},{span:[language.length,language.length],expected:'',replacement:append,declaration:added.getText(output)}],originalDeclarations,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false};
}
