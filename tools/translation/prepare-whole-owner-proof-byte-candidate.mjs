import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
// Explicit complete consumer closure. Old/default and existing bulk copies stay exact.
import {readFileSync,writeFileSync,existsSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareOperationProofByteSources} from './prepare-operation-proof-byte-sources.mjs';
import {prepareWholeOwnerResolverCandidate} from './prepare-whole-owner-resolver-candidate.mjs';
import {transportConcreteSyntaxParsedChunks,transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/';
const BRIDGE='operation-proof-byte-bridge.mjs',FALLBACK='operation-proof-byte-original-fallback.mjs',SCOPE='operation-proof-byte-consumer-scope.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Whole owner proof byte source: '+message);};
const bridgeSource=String.raw`// Explicit operation-local bytes only; no source/checker/owner authority.
import {types} from 'node:util';
import {createScopedPrivateNativeProofJsonSerializer as originalScoped} from './private-native-proof-json.mjs';
import {createPrivateFrozenJsonComposer as originalComposer} from './private-frozen-json.mjs';
import {withOperationProofByteComposition} from './operation-proof-byte-consumer-scope.mjs';
import {originalBatchedNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const ready=originalBatchedNamespaceTraversalIntrinsicsUnchanged()&&originalBatchedLexingIntrinsicsUnchanged();
const proxy=ready?types.isProxy:null,BridgeError=TypeError;
let active=null;
// There is deliberately no exported arbitrary serializer setter or frame data.
function factory(original){
 return value=>{const frame=active;return frame&&frame.open?frame.serialize(value):original(value);};
}
export function createScopedPrivateNativeProofJsonSerializer(){return factory(originalScoped());}
export function createPrivateFrozenJsonComposer(){return factory(originalComposer());}
// The separate scope fallback calls this BEFORE the exact old serializer can
// invoke any callback. It exposes no capability to turn byte composition on.
export function suspendOperationProofByteConsumers(run){
 const prior=active;active=null;
 try{return run();}finally{active=prior;}
}
export function withOperationProofByteConsumerBridge(run){
 if(!ready||typeof run!=='function'||proxy(run))throw new BridgeError('Proof byte bridge requires a qualified synchronous callback');
 return withOperationProofByteComposition(serialize=>{
  const prior=active,frame={open:true,serialize};active=frame;
  try{return run();}
  finally{frame.open=false;frame.serialize=null;active=prior;}
 });
}
`;
const fallbackSource=String.raw`// Function-only import cycle: no top-level call reads the bridge frame.
import {createScopedPrivateNativeProofJsonSerializer as originalScoped} from './private-native-proof-json.mjs';
import {suspendOperationProofByteConsumers} from './operation-proof-byte-bridge.mjs';
export function createScopedPrivateNativeProofJsonSerializer(){
 const original=originalScoped();
 return value=>suspendOperationProofByteConsumers(()=>original(value));
}
`;
const targets=[
 ['derive-bang-context.mjs','whole-owner-derive-bang-context-candidate.mjs'],
 ['builtin-derive-bang-footprints.mjs','whole-owner-builtin-derive-bang-footprints-candidate.mjs'],
 ['serde-bang-footprints.mjs','whole-owner-serde-bang-footprints-candidate.mjs'],
 ['serde-deserialize-bang-footprints.mjs','whole-owner-serde-deserialize-bang-footprints-candidate.mjs'],
 ['clap-args-bang-footprints.mjs','whole-owner-clap-args-bang-footprints-candidate.mjs'],
 ['clap-value-enum-bang-footprints.mjs','whole-owner-clap-value-enum-bang-footprints-candidate.mjs'],
 ['schemars-bang-footprints.mjs','whole-owner-schemars-bang-footprints-candidate.mjs'],
 ['module-bindings.mjs','whole-owner-module-bindings-candidate.mjs'],
 ['derive-output-effects.mjs','whole-owner-derive-output-effects-candidate.mjs'],
 ['whole-owner-original-binding-bootstrap.mjs','whole-owner-original-binding-bootstrap.mjs'],
 ['attribute-owner-bulk-operation.mjs','attribute-owner-bulk-operation.mjs'],
 ...['builtin-debug-ast-route.mjs','builtin-eq-ast-route.mjs','builtin-partial-eq-ast-route.mjs','builtin-ordering-ast-route.mjs'].map(name=>[name,name]),
].map(([physical,input])=>({physical,input,output:'proof-byte-whole-owner-'+input.replace(/^whole-owner-/u,'')}));
export const WHOLE_OWNER_PROOF_BYTE_PHYSICAL_PATHS=Object.freeze(targets.map(row=>BASE+row.physical));
function one(rows,message){if(rows.length!==1)fail(message);return rows[0];}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native source grammar differs: '+path);return file;}
function edits(source,rows){let result=source;for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){if(result.slice(...row.span)!==row.expected)fail('complete native source selection differs');result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);}return result;}
function names(ts,node){if(!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings))return [];return node.importClause.namedBindings.elements.map(row=>({imported:(row.propertyName??row.name).text,local:row.name.text,source:row.getText()}));}
function relocated(ts,path,source,mapping,{serializers=false}={}){
 const file=parse(ts,path,source),rows=[];
 for(const node of file.statements){if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier))continue;
  const owner=node.moduleSpecifier.text,bindings=names(ts,node);
  if(serializers&&(owner==='./private-native-proof-json.mjs'||owner==='./private-frozen-json.mjs'||owner==='./operation-proof-byte-bridge.mjs')){
   const selected=bindings.filter(row=>row.imported==='createScopedPrivateNativeProofJsonSerializer'||row.imported==='createPrivateFrozenJsonComposer');
   if(selected.length){
    if(bindings.length!==selected.length||node.importClause.name)fail('serializer requires its complete genuine named import binding');
    rows.push({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:node.moduleSpecifier.getText(file),replacement:JSON.stringify('./'+BRIDGE),kind:'serializer-binding',bindings});continue;
   }
  }
  const replacement=mapping.get(owner);if(replacement)rows.push({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:node.moduleSpecifier.getText(file),replacement:JSON.stringify(replacement),kind:'coherent-private-issuer',bindings});
 }
 return {source:edits(source,rows),edits:rows};
}
function hashCalls(ts,path,source){const file=parse(ts,path,source),rows=[];function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['update','digest'].includes(node.expression.name.text))rows.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return rows;}
export function prepareWholeOwnerProofByteCandidate({root=ROOT}={}){
 const nativeBatchRows=[];function verifyNativeCopiedSourceBindings(compiler,path,source){if(compiler!==ts)fail('native compiler association differs');const result={};nativeBatchRows.push({path,source,result});return result;}

 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('actual root installed TypeScript5.9.3 required');
 const operation=prepareOperationProofByteSources({root}),resolver=prepareWholeOwnerResolverCandidate({root}),bulk=resolver.wholeOwnerProducer;
 if([...operation.files,...resolver.files,...bulk.files].some(row=>row.current!==row.after))fail('fresh complete materialized operation and existing whole-owner closure required');
 const inputs=new Map(),files=[],physicalOverlays=[],prerequisites=[operation.input,...resolver.inputs,...bulk.inputs];
 function input(path){if(!inputs.has(path)){const state=lstatSync(resolve(root,path));if(!state.isFile()||state.isSymbolicLink()||state.size>2*1024*1024)fail('bounded regular complete source input required');const source=readFileSync(resolve(root,path),'utf8');inputs.set(path,{path,source,sha256:hash(source)});}return inputs.get(path).source;}
 function whole(path,before,language,after,selection){
  if(after.split('\n').length>=1000)fail('complete generated source line budget');parse(ts,path,language);parse(ts,path,after);
  const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),rule=(old,value,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:value}]}),sequence={languageRules:[rule(before,language,'javascript:complete-original-proof-byte-consumer-copy')],repositoryRules:[rule(language,after,'router:single-private-issuer-and-operation-byte-import-closure')]},first=(()=>{const rows=transportConcreteSyntaxParsedChunks([[{source:before,language:'JavaScript'},{source:language,language:'JavaScript'},{source:after,language:'JavaScript'}]]).chunks[0].rows;if(rows.length!==3||rows[0].source!==before||rows[1].source!==language||rows[2].source!==after)fail('complete phase source batch differs');return {...rows[0],completePhaseTransports:rows};})(),stages=[];let document=first.document,transported=first;
  for(const phase of ['language','repository']){
   const from=phase==='language'?before:language,to=phase==='language'?language:after,beforeMeta=transported.meta,fresh=transported;if(fresh.source!==from)fail('complete current phase source differs');
   const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?sequence.languageRules:[],repositoryRules:phase==='repository'?sequence.repositoryRules:[]}),afterMeta=serializeConcreteSyntaxMeta(run.value),last=first.completePhaseTransports[phase==='language'?1:2];if(last.source!==to||last.meta!==afterMeta)fail('complete phase CST source equation differs');
   const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:phase==='language'?[rule(to,from,'javascript:restore-complete-original-consumer')]:[],repositoryRules:phase==='repository'?[rule(to,from,'router:restore-complete-original-issuer-imports')]:[]});const inverseMeta=serializeConcreteSyntaxMeta(inverse.value),restored=fresh;if(inverse.value.source!==from||restored.source!==from||restored.meta!==inverseMeta||inverseMeta!==beforeMeta)fail('complete phase source inverse differs');
   stages.push({phase,before:from,after:to,beforeMeta,afterMeta,trace:run.trace,completeInverse:true});document=last.document;transported=last;
  }
  if(JSON.stringify(hashCalls(ts,path,before))!==JSON.stringify(hashCalls(ts,path,after)))fail('every complete original Hash update/digest call must stay exact');
  return {path,before,language,after,current:existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta:transported.meta,inverse:before,sequence,stages,trace:stages.flatMap(row=>row.trace),nativeBindings,selection};
 }
 const mapping=new Map();for(const row of targets)for(const name of [row.physical,row.input])mapping.set('./'+name,'./'+row.output);
 let scope=input(BASE+'operation-proof-byte-scope.mjs');const scoped=relocated(ts,BASE+SCOPE,scope,new Map([['./private-native-proof-json.mjs','./'+FALLBACK]]));
 if(scoped.edits.length!==1||scoped.edits[0].bindings.length!==1||scoped.edits[0].bindings[0].imported!=='createScopedPrivateNativeProofJsonSerializer')fail('exact complete original operation fallback factory binding required');
 files.push(whole(BASE+SCOPE,scope,scope,scoped.source,{imports:scoped.edits,oldOperationBodyUnchanged:true}));
 files.push(whole(BASE+BRIDGE,'',bridgeSource,bridgeSource,{newBridge:true,publicSerializerSetter:false}));
 files.push(whole(BASE+FALLBACK,'',fallbackSource,fallbackSource,{oldFallbackSuspendsBridge:true,functionOnlyImportCycle:true}));
 const cyclePaths=[SCOPE,BRIDGE,FALLBACK],cycleEvidence=[];
 for(const name of cyclePaths){
  const row=one(files.filter(row=>row.path===BASE+name),'one complete cycle source required'),file=parse(ts,row.path,row.after),bindings=new Set(),edges=[];
  for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&cyclePaths.some(path=>node.moduleSpecifier.text==='./'+path)){for(const binding of names(ts,node))bindings.add(binding.local);edges.push({source:node.getText(file),span:[node.getStart(file),node.end],target:node.moduleSpecifier.text});}
  const references=[];function visit(node){if(ts.isImportDeclaration(node)||ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node))return;if(ts.isIdentifier(node)&&bindings.has(node.text))references.push({name:node.text,span:[node.getStart(file),node.end]});ts.forEachChild(node,visit);}for(const node of file.statements)visit(node);
  if(references.length)fail('cyclic bridge imports must never be read/called during module initialization');cycleEvidence.push({path:row.path,imports:edges,topLevelCrossCycleReferences:references});
 }
 for(const row of targets){
  const path=BASE+row.output,before=input(BASE+row.input);let language=before;const operationEdits=[];
  if(row.physical==='attribute-owner-bulk-operation.mjs'){
   const file=parse(ts,path,before),calls=[];function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='run'&&node.arguments.length===0&&ts.isVariableDeclaration(node.parent)&&node.parent.name.getText(file)==='result')calls.push(node);ts.forEachChild(node,visit);}visit(file);
   const call=one(calls,'one actual qualified complete bulk callback required');operationEdits.push({span:[call.getStart(file),call.end],expected:call.getText(file),replacement:'withOperationProofByteConsumerBridge(run)'});language=edits(before,operationEdits);language="import {withOperationProofByteConsumerBridge} from './"+BRIDGE+"';\n"+language;
  }
  const changed=relocated(ts,path,language,mapping,{serializers:true}),copy=whole(path,before,language,changed.source,{sourcePath:BASE+row.input,physicalPath:BASE+row.physical,operationEdits,imports:changed.edits,completeOriginalHashCalls:hashCalls(ts,path,before)});files.push(copy);
 }
 const physicalMapping=new Map(targets.map(row=>['./'+row.output,'./'+row.physical]));
 for(const row of targets){
  const copy=one(files.filter(file=>file.path===BASE+row.output),'one complete copied private issuer required'),original=input(BASE+row.physical),routed=relocated(ts,BASE+row.physical,copy.after,physicalMapping);let candidate=routed.source;const routes=[];
  if(['derive-bang-context.mjs','module-bindings.mjs'].includes(row.physical)){
   const file=parse(ts,BASE+row.physical,candidate),name=row.physical==='derive-bang-context.mjs'?'createDeriveBangContext':'resolveModuleBindings',node=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'one actual complete public original entry required'),originalFile=parse(ts,BASE+row.physical,original),old=one(originalFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'one current complete public entry required');
   if(node.getText(file)!==old.getText(originalFile))fail('complete original public entry was not preserved');let call='createWholeOwnerDeriveBangContext({deriveContext})';
   if(row.physical==='module-bindings.mjs'){
    const statement=one([...old.body.statements],'one actual retained original resolver return required');if(!ts.isReturnStatement(statement)||!ts.isCallExpression(statement.expression)||statement.expression.arguments.length!==1)fail('original resolver retained wrapper differs');const arrow=statement.expression.arguments[0];if(!ts.isArrowFunction(arrow)||!ts.isCallExpression(arrow.body)||arrow.body.arguments.length!==1||!ts.isObjectLiteralExpression(arrow.body.arguments[0]))fail('complete original resolver input object required');call='resolveWholeOwnerModuleBindings('+arrow.body.arguments[0].getText(originalFile)+')';
   }
   routes.push({span:[node.body.getStart(file),node.body.end],expected:node.body.getText(file),replacement:'{return '+call+';}'});candidate=edits(candidate,routes);
  }
  const overlay=whole(BASE+row.physical,original,copy.after,candidate,{sourceCopyPath:copy.path,imports:routed.edits,routes,physicalPrivateIssuerClosure:true});physicalOverlays.push({...overlay,original,candidate});
 }
 const facade="// Explicit bytes variant; every issuer belongs to this same copied closure.\nexport * from './"+targets[0].output+"';\nexport * from './"+targets.find(row=>row.physical==='module-bindings.mjs').output+"';\n";
 files.push(whole(BASE+'proof-byte-whole-owner-candidate.mjs','',facade,facade,{explicitOptInOnly:true}));
 const serializerBindings=files.flatMap(row=>(row.selection.imports??[]).filter(edit=>edit.kind==='serializer-binding').map(edit=>({path:row.path,...edit})));
 if(serializerBindings.length!==5)fail('complete current native/frozen composer consumer import census differs');
 input(BASE+'prepare-whole-owner-proof-byte-candidate.mjs');
 const nativeBatchChecks=verifyNativeCopiedSourceBindingBatch(ts,nativeBatchRows);if(nativeBatchChecks.length!==nativeBatchRows.length)fail('complete native result census differs');for(let index=0;index<nativeBatchRows.length;index++)Object.assign(nativeBatchRows[index].result,nativeBatchChecks[index]);
 for(const row of [...inputs.values(),...prerequisites])if(hash(readFileSync(resolve(root,row.path)))!==row.sha256)fail('complete current source input/prerequisite changed');
 return {schema:'whole-owner-operation-proof-byte-candidate-v1',typescriptVersion:ts.version,inputs:[...inputs.values()],prerequisiteInputs:prerequisites,files,physicalOverlays,serializerBindings,cycleEvidence,operationProducer:operation,resolverProducer:resolver,existingDefaultsUnchanged:true,existingBulkCopiesUnchanged:true,scope:'one qualified complete synchronous owner operation; no retained encoded bytes',newAcrossInvocationEncodedCache:false,originalHashCallsUnchanged:true,performanceQualified:false,runtimeExecuted:false,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');const plan=prepareWholeOwnerProofByteCandidate();
 if(mode==='--write'){for(const row of plan.files){const current=existsSync(resolve(ROOT,row.path))?readFileSync(resolve(ROOT,row.path),'utf8'):null;if(current!==row.current)fail('current complete output changed');}for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('whole byte consumer closure stale or ungenerated');
 console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),performanceQualified:false,runtimeExecuted:false}));
}
