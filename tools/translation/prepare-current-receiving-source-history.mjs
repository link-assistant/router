// Historical source-comparison DATA only; installed compiler/issuer APIs stay current.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {prepareDefaultProofByteAdoption} from './prepare-default-proof-byte-adoption.mjs';
import {invocationLocalFreezerSourcePairs} from './prepare-invocation-local-freezer.mjs';
import {prepareGuardedProofLexing,assertGuardedProofLexingInputsFresh} from './prepare-guarded-proof-lexing.mjs';
import {assertSchemarsEnclosingHistoryFresh} from './schemars-enclosing-history.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/';
const ARCHIVE=BASE+'source-profiles/current-receiving-source-history/complete-originals.json.gz';
const PACKED='de5c88ca6b3eb54d6f949dc0ed070c4b25c2c9c44ce63ec5e618ba45d146e6a3',RAW='4010bfe88497e06a4f1314476484c7694fe9cf92f1e65357c691fa600b96a823';
const HELPER=BASE+'test/fixtures/current-receiving-source-history.mjs',COPY=BASE+'invocation-local-freezer-receiving-history.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Current receiving source history: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one actual native selection required: '+label);return rows[0];};
function syntax(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path);return file;}
function edit(file,node,replacement){return {span:[node.getStart(file),node.end],expected:node.getText(file),replacement};}
function apply(source,edits){
 let result=source,last=source.length;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||result.slice(...row.span)!==row.expected)fail('native selection changed');result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);last=row.span[0];}
 let delta=0;const mapping=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const start=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;return {...row,afterSpan:[start,start+row.replacement.length]};});let inverse=result;
 for(const row of mapping.reverse()){if(inverse.slice(...row.afterSpan)!==row.replacement)fail('native inverse span differs');inverse=inverse.slice(0,row.afterSpan[0])+row.expected+inverse.slice(row.afterSpan[1]);}if(inverse!==source)fail('whole native inverse differs');return result;
}
function stage(ts,path,before,after,phase){
 syntax(ts,path,before);syntax(ts,path,after);
 const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),fresh=transportConcreteSyntaxMeta(beforeMeta);if(fresh.source!==before)fail('complete phase input differs');
 const rule=(source,target,id)=>({id,edits:[{span:[0,source.length],expected:source,replacement:target}]}),sequence={languageRules:phase==='language'?[rule(before,after,'javascript:actual-native-source-history')]:[],repositoryRules:phase==='repository'?[rule(before,after,'receiving:complete-source-history-layer')]:[]};
 const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),readback=transportConcreteSyntaxMeta(afterMeta);if(readback.source!==after)fail('complete phase reparse differs');
 const reverse=applyConcreteSyntaxSubstitutions(readback.document,{languageRules:phase==='language'?[rule(after,before,'javascript:restore-whole-current-source')]:[],repositoryRules:phase==='repository'?[rule(after,before,'receiving:restore-whole-source-layer')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reverse.value)).source!==before)fail('complete phase inverse differs');
 return {phase,before,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:before};
}
function equation(ts,path,before,language,after,nativeSelections=[]){const stages=[stage(ts,path,before,language,'language'),stage(ts,path,language,after,'repository')];if(after.split('\n').length>=1000)fail('source must remain below1000lines');return {path,before,language,after,beforeSha256:hash(before),afterSha256:hash(after),nativeSelections,stages,trace:stages.flatMap(row=>row.trace),inverse:before,sourceAuthority:false};}
function exported(ts,file,name){return one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name&&node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)),name);}
function nativeHistory(ts,row){
 const before=syntax(ts,row.path,row.before),after=syntax(ts,row.path,row.after);
 if(row.declaration){
  const node=exported(ts,after,row.declaration);if(before.statements.some(value=>ts.isFunctionDeclaration(value)&&value.name?.text===row.declaration))fail('later declaration already present in historical source');
  let start=0,endBefore=row.before.length,endAfter=row.after.length;while(start<endBefore&&row.before[start]===row.after[start])start++;while(endBefore>start&&endAfter>start&&row.before[endBefore-1]===row.after[endAfter-1]){endBefore--;endAfter--;}
  if(endBefore!==start||node.getStart(after)<start||node.end>endAfter)fail('only complete later declaration/comments may extend the source');
  const insertion={span:[start,start],expected:'',replacement:row.after.slice(start,endAfter),declarationSpan:[node.getStart(after),node.end],declarationSource:node.getText(after)};if(apply(row.before,[insertion])!==row.after||row.after.slice(0,start)+row.after.slice(endAfter)!==row.before)fail('native declaration whole prefix/suffix inverse differs');
  return {...row,nativeSelections:[insertion],equation:equation(ts,row.path,row.before,row.after,row.after,[insertion]),completePrefixAndSuffixPreserved:true};
 }
 // The literal packet producer changed the actual final CLI and appended whole
 // functions; all preceding native statements remain independently identical.
 const cli=file=>one(file.statements.filter(node=>ts.isIfStatement(node)&&node.expression.getText(file).includes('process.argv[1]')),'original complete CLI');
 const oldCli=cli(before),newCli=cli(after),a=before.statements.indexOf(oldCli),b=after.statements.indexOf(newCli);if(a!==b||before.statements.length!==a+1)fail('exact original terminal CLI boundary required');
 for(let at=0;at<a;at++)if(before.statements[at].getText(before)!==after.statements[at].getText(after))fail('preexisting complete native declaration changed');
 if(oldCli.expression.getText(before)!==newCli.expression.getText(after)||row.before.slice(0,oldCli.getStart(before))!==row.after.slice(0,newCli.getStart(after)))fail('original CLI guard or complete preceding source changed');
 const selections=[{beforeSpan:[oldCli.getStart(before),oldCli.end],afterSpan:[newCli.getStart(after),newCli.end],before:oldCli.getText(before),after:newCli.getText(after)},...after.statements.slice(b+1).map(node=>({afterSpan:[node.getStart(after),node.end],after:node.getText(after)}))];
 if(selections.length<2)fail('actual later complete packet declarations required');return {...row,nativeSelections:selections,equation:equation(ts,row.path,row.before,row.after,row.after,selections),originalCliAndEveryLaterDeclarationRetained:true};
}
function render(records,guardedRecords,aliasNames){return `// Generated by prepare-current-receiving-source-history.mjs. Comparison DATA only.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {restoreCompilerDataAliasHistory} from './compiler-data-alias-history.mjs';
const GUARDED=${JSON.stringify(guardedRecords)};
const ALIAS_NAMES=${JSON.stringify(aliasNames)};
const RECORDS=${JSON.stringify(records)};
const fail=message=>{throw new TypeError('Current receiving source history DATA: '+message);};
export function restoreReceivingSourceHistory(source,lane,retain=()=>{}){
 if(typeof source!=='string'||typeof lane!=='string'||typeof retain!=='function')fail('primitive complete source/lane and callback required');
 const rows=RECORDS.filter(row=>row.lane===lane);if(!rows.length)fail('unknown exact comparison lane');
 const selected=rows.filter(row=>row.current===source);if(selected.length>1)fail('ambiguous whole source');
 if(!selected.length){if(rows.some(row=>row.historical===source))return source;if(lane==='proof-consumer'&&!source.includes('operation-proof-byte-bridge.mjs'))return source;fail('unregistered complete current source');}
 const row=selected[0];retain('complete-later-source-history-'+lane,{path:row.path,current:source,historical:row.historical,provenance:row.provenance,inverse:row.current,sourceAuthority:false,ownerAuthority:false});return row.historical;
}
// Original filesystem operation/arguments happen first. Archives and unrelated
// paths stay byte exact; only the explicitly registered physical text is viewed.
export function restoreGuardedProofReceivingHistory(source,retain=()=>{}){
 if(typeof source!=='string'||typeof retain!=='function')fail('complete guarded history source and callback required');
 const rows=GUARDED.filter(row=>row.current===source);if(rows.length>1)fail('ambiguous exact guarded history');
 if(!rows.length){if(GUARDED.some(row=>row.historical===source))return source;fail('unregistered complete guarded consumer');}
 const row=rows[0];retain('complete-guarded-proof-source-history',{path:row.path,current:source,historical:row.historical,provenance:row.provenance,inverse:source,sourceAuthority:false});return row.historical;
}
export function readOriginalBuiltinPlanReceivingHistory(...args){
 const source=readFileSync(...args);if(typeof source!=='string')return source;const input=args[0],path=input instanceof URL?fileURLToPath(input):typeof input==='string'?resolve(input):null;
 const names=ALIAS_NAMES.filter(name=>path===fileURLToPath(new URL('../../'+name,import.meta.url)));if(!names.length)return source;if(names.length!==1)fail('ambiguous original alias source');const name=names[0];
 let historical=source;if(name==='builtin-derive-bang-footprints.mjs')historical=restoreReceivingSourceHistory(historical,'proof-consumer');if(name==='private-frozen-json.mjs')historical=restoreGuardedProofReceivingHistory(historical);
 return restoreCompilerDataAliasHistory(historical,name);
}
export function readFreezerReceivingHistory(...args){
 const source=readFileSync(...args);if(typeof source!=='string')return source;const input=args[0],path=input instanceof URL?fileURLToPath(input):typeof input==='string'?resolve(input):null;
 const selected=RECORDS.filter(row=>row.lane==='freezer-budget-extension'&&path===fileURLToPath(new URL('../../../../'+row.path,import.meta.url)));
 return selected.length?restoreReceivingSourceHistory(source,'freezer-budget-extension'):source;
}
`;}
function insertCall(ts,path,source,name,call){const file=syntax(ts,path,source),node=one(file.statements.filter(value=>ts.isFunctionDeclaration(value)&&value.name?.text===name),name),at=node.body.getStart(file)+1;return {span:[at,at],expected:'',replacement:'\n '+call};}
export function prepareCurrentReceivingSourceHistory({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const snapshots=new Map(),physical=path=>{const source=readFileSync(resolve(root,path),'utf8');snapshots.set(path,source);return source;};
 const packed=readFileSync(resolve(root,ARCHIVE));if(packed.length!==74158||hash(packed)!==PACKED)fail('complete historical archive differs');const raw=gunzipSync(packed,{maxOutputLength:1048576});if(raw.length!==385439||hash(raw)!==RAW)fail('complete historical source bytes differ');const archive=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));if(archive.schema!=='complete-current-receiving-source-history-v1'||archive.rows.length!==3||archive.templates.length!==5)fail('exact historical source universe required');
 const templates=new Map();for(const row of archive.templates){if(templates.has(row.path)||hash(row.source)!==row.sha256)fail('complete original receiving template differs');templates.set(row.path,row.source);}
 const read=path=>{const source=physical(path);return templates.has(path)?templates.get(path):source;};
 read(BASE+'prepare-current-receiving-source-history.mjs');read(BASE+'prepare-default-proof-byte-adoption.mjs');
 const guarded=prepareGuardedProofLexing({root}),guardedRecords=guarded.files.filter(row=>row.consumerBodyUnchanged).map(row=>({path:row.path,current:row.text,historical:row.source,provenance:{producer:'prepare-guarded-proof-lexing.mjs',schema:guarded.schema,nativeImport:row.nativeImport,sourceSha256:row.sourceSha256,sha256:row.sha256}}));if(guardedRecords.length!==2)fail('both complete actual guarded consumer equations required');
 const history=archive.rows.map(row=>{const current=read(row.path),guard=guarded.files.find(value=>value.path===row.path);if(hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||current!==row.after&&!(guard&&guard.source===row.after&&guard.current===current&&guard.text===current))fail('complete physical/Git/known-guarded source join differs: '+row.path);return {...nativeHistory(ts,row),physicalCurrent:current,guardedLayer:current===row.after?null:guard};});
 // Invoke the actual original complete producer once, including all its fresh
 // archive, prerequisite, native-symbol, current-source and inverse checks.
 const defaultArchive=BASE+'source-profiles/default-proof-byte-adoption/complete-original-inputs.json.gz',defaultPacked=readFileSync(resolve(root,defaultArchive)),bytePlan=prepareDefaultProofByteAdoption({root}),records=[];
 for(const row of bytePlan.files.filter(row=>row.serializerBindings)){
  if(row.current!==row.after||read(row.path)!==row.after||row.inverse!==row.before)fail('actual complete default consumer adoption differs');
  records.push({lane:'proof-consumer',path:row.path,current:row.after,historical:row.before,provenance:{producer:'prepare-default-proof-byte-adoption.mjs',schema:bytePlan.schema,nativeSelections:row.nativeSelections,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256,defaultArchiveSha256:hash(defaultPacked)}});
 }
 if(records.length!==5)fail('all five complete original consumer equations required');
 for(const row of history)records.push({lane:row.lane,path:row.path,current:row.physicalCurrent,historical:row.before,provenance:{guardedLayer:row.guardedLayer?{schema:guarded.schema,nativeImport:row.guardedLayer.nativeImport,source:row.guardedLayer.source,text:row.guardedLayer.text}:null,archive:ARCHIVE,archiveSha256:PACKED,beforeCommit:row.beforeCommit,afterCommit:row.afterCommit,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256,nativeSelections:row.nativeSelections}});
 const freezerPairs=invocationLocalFreezerSourcePairs(root),nativePair=one(freezerPairs.filter(row=>row.path===BASE+'private-native-proof-json.mjs'),'original native freezer equation');if(nativePair.after!==one(history.filter(row=>row.lane==='freezer-budget-extension'),'budget extension').before)fail('complete invocation producer/next extension boundary differs');
 const outputs=[],add=(path,language,after,selections=[])=>{const current=existsSync(resolve(root,path))?physical(path):'',before=templates.get(path)??'';if(current!==before&&current!==after)fail('complete receiving target differs from birth/exact generated equation: '+path);outputs.push({...equation(ts,path,before,language,after,selections),current});};
 const aliasPath=BASE+'test/fixtures/compiler-data-alias-history.mjs',aliasSource=read(aliasPath),aliasFile=syntax(ts,aliasPath,aliasSource),aliasDeclarations=aliasFile.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>ts.isIdentifier(node.name)&&node.name.text==='RECORDS');const aliasNode=one(aliasDeclarations,'complete actual original alias records');if(!ts.isArrayLiteralExpression(aliasNode.initializer))fail('actual complete original alias JSON DATA required');const aliasRows=JSON.parse(aliasNode.initializer.getText(aliasFile)),aliasNames=aliasRows.map(row=>row.name);if(aliasNames.length!==6||new Set(aliasNames).size!==6)fail('complete original alias reader scope differs');
 const helper=render(records,guardedRecords,aliasNames);add(HELPER,helper,helper);
 const fixturePath=BASE+'test/fixtures/native-proof-json-format.mjs',fixture=read(fixturePath),fixtureEdits=[insertCall(ts,fixturePath,fixture,'legacyProofConsumerSource',"if(typeof source==='string')source=restoreReceivingSourceHistory(source,'proof-consumer',retain);"),insertCall(ts,fixturePath,fixture,'restoreCurrentEnclosingNamespaceSource',"if(typeof source==='string'&&source.includes('export function coreAdoptionProducerClosedAttributeSpans('))source=restoreReceivingSourceHistory(source,'core-attribute-extension',retain);")],fixtureLanguage=apply(fixture,fixtureEdits),fixtureAfter=apply(fixtureLanguage,[{span:[0,0],expected:'',replacement:"import {restoreReceivingSourceHistory} from './current-receiving-source-history.mjs';\n"}]);add(fixturePath,fixtureLanguage,fixtureAfter,fixtureEdits);
 const planPath=BASE+'test/builtin-plan-json-composition.test.mjs',plan=read(planPath);if(snapshots.get(planPath)!==plan)fail('complete original builtin plan suite changed');
 const progressPath=BASE+'test/core-adoption-progress.test.mjs',progress=read(progressPath),progressEdit=insertCall(ts,progressPath,progress,'progressLayoutHistory',"if(path==='tools/translation/propose-core-adoption-corpus.mjs')source=restoreReceivingSourceHistory(source,'progress-packets',retain);"),progressLanguage=apply(progress,[progressEdit]),progressAfter=apply(progressLanguage,[{span:[0,0],expected:'',replacement:"import {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';\n"}]);add(progressPath,progressLanguage,progressAfter,[progressEdit]);
 const producerPath=BASE+'prepare-invocation-local-freezer.mjs',producer=read(producerPath),producerFile=syntax(ts,producerPath,producer),fsImport=one(producerFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='node:fs'),'complete original freezer source reader');if(fsImport.getText(producerFile)!=="import {readFileSync} from 'node:fs';")fail('complete original freezer source reader binding differs');
 if(snapshots.get(producerPath)!==producer)fail('complete original freezer producer changed');
 const producerEdit=edit(producerFile,fsImport,"import {readFreezerReceivingHistory as readFileSync} from './test/fixtures/current-receiving-source-history.mjs';"),copy=apply(producer,[producerEdit]);add(COPY,producer,copy,[producerEdit]);
 const freezerTestPath=BASE+'test/invocation-local-freezer.test.mjs',freezerTest=read(freezerTestPath),freezerTestFile=syntax(ts,freezerTestPath,freezerTest),freezerImport=one(freezerTestFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../prepare-invocation-local-freezer.mjs'),'original freezer proposal import'),freezerEdit=edit(freezerTestFile,freezerImport.moduleSpecifier,"'../invocation-local-freezer-receiving-history.mjs'");add(freezerTestPath,apply(freezerTest,[freezerEdit]),apply(freezerTest,[freezerEdit]),[freezerEdit]);
 for(const row of bytePlan.files){const actual=existsSync(resolve(root,row.path))?readFileSync(resolve(root,row.path),'utf8'):null;if(actual!==row.current)fail('complete default producer target changed');}for(const row of bytePlan.prerequisiteInputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete default producer prerequisite changed');for(const layer of bytePlan.historicalLayers){for(const row of layer.inputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete historical predecessor input changed');assertSchemarsEnclosingHistoryFresh({root,history:layer.history});}if(readFileSync(resolve(root,bytePlan.fragment.path),'utf8')!==bytePlan.fragment.source)fail('complete authored byte operation changed');
 assertGuardedProofLexingInputsFresh(guarded);
 for(const [path,source]of snapshots)if(readFileSync(resolve(root,path),'utf8')!==source)fail('complete source input changed during history construction');if(!readFileSync(resolve(root,ARCHIVE)).equals(packed)||!readFileSync(resolve(root,defaultArchive)).equals(defaultPacked))fail('complete binary history changed during operation');
 return {schema:'complete-current-receiving-source-history-proposal-v1',files:outputs,records,history,guarded,guardedRecords,defaultByteHistory:bytePlan,freezerPairs,inputs:[...snapshots].map(([path,source])=>({path,source,sha256:hash(source)})),binaryInputs:[{path:ARCHIVE,bytes:packed.length,sha256:PACKED},{path:defaultArchive,bytes:defaultPacked.length,sha256:hash(defaultPacked)}],sourceAuthority:false,ownerAuthority:false,runtimeImplementationChanged:false,originalCaseBodiesAndDeadlinesUnchanged:true,receivingExecuted:false,sourceInstalled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check; this is an explicit receiving-history proposal');const plan=prepareCurrentReceivingSourceHistory();if(args[0]==='--write'){for(const row of plan.files)if((existsSync(resolve(ROOT,row.path))?readFileSync(resolve(ROOT,row.path),'utf8'):'')!==row.current)fail('target changed before explicit history write');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}else if(args[0]==='--check'){if(plan.files.some(row=>row.current!==row.after))fail('complete generated receiving history is stale');console.log('Complete current/historical receiving sources are fresh; no compiler authority.');}else console.log(JSON.stringify(plan));
}
