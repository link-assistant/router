// Explicit source proposal for the existing default issuers, not new issuers.
import {readFileSync,writeFileSync,existsSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareSchemarsEnclosingAdoption} from './prepare-schemars-enclosing-adoption.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/',PROFILE=BASE+'source-profiles/default-proof-byte-adoption/';
const ARCHIVE=PROFILE+'complete-original-inputs.json.gz',FRAGMENT=PROFILE+'default-proof-byte-operation.mjs.txt',HELPER=BASE+'default-proof-byte-operation.mjs';
const ARCHIVE_PIN='5d6ab1bebb994fccbb2f5b32cb1d425447edd4f84adf784b7cf1ee5c836ac3e3',RAW_PIN='7151ca3c4f21e5095bcf2d3d72b82ba0f0fb8be70b75926908d0d2500a7c8930',FRAGMENT_PIN='0290fff27f07822424a6da837626c9245ad04ee28b846ea9a5b1d3d354e0762a';
const CONSUMERS=['builtin-derive-bang-footprints.mjs','builtin-debug-ast-route.mjs','builtin-eq-ast-route.mjs','builtin-partial-eq-ast-route.mjs','builtin-ordering-ast-route.mjs'];
const ENCLOSING=BASE+'derive-enclosing-namespace-context.mjs',DEFAULT=BASE+'default-trait-source.mjs',PRODUCER=BASE+'prepare-whole-owner-proof-byte-candidate.mjs';
const PREREQUISITES=['operation-proof-byte-bridge.mjs','operation-proof-byte-consumer-scope.mjs','operation-proof-byte-original-fallback.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Default proof byte adoption: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one exact native selection required: '+label);return rows[0];};
function compiler(root){const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('actual root installed native TypeScript5.9.3 required');return ts;}
function originalInputs(root){
 const packed=readFileSync(resolve(root,ARCHIVE));if(packed.length!==63979||hash(packed)!==ARCHIVE_PIN)fail('complete original archive differs');const raw=gunzipSync(packed,{maxOutputLength:1048576});if(raw.length!==270943||hash(raw)!==RAW_PIN)fail('complete original sources differ');
 const archive=JSON.parse(new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw));if(archive.schema!=='default-proof-byte-adoption-original-inputs-v1'||archive.files.length!==11)fail('complete original input vector differs');const originals=new Map();
 for(const row of archive.files){if(originals.has(row.path)||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('complete original source/hash join differs');originals.set(row.path,row);}return {archive,originals};
}
function sourceAt(root,path){const absolute=resolve(root,path);if(!existsSync(absolute))return null;const state=lstatSync(absolute);if(!state.isFile()||state.isSymbolicLink()||state.size>2*1024*1024)fail('bounded regular complete source required: '+path);return readFileSync(absolute,'utf8');}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function nativeCopy(ts,path,source){
 const file=parse(ts,path,source),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};
 const nodes=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;}),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,nodes));
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(parse(ts,path,copy)))!==JSON.stringify(shape(file)))fail('complete detached native AST differs: '+path);return {source,copy,completeNativeAstCopy:true};
}
function checkerFor(ts,path,file){
 const absolute=resolve(path),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 return ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host).getTypeChecker();
}
function apply(source,edits){let result=source,last=source.length;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||result.slice(...row.span)!==row.expected)fail('complete native source selection changed');result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);last=row.span[0];}return result;}
function selection(file,node,replacement,kind){return {kind,span:[node.getStart(file),node.end],expected:node.getText(file),replacement};}
function functions(ts,file,name){return file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);}
function calls(ts,node,name){const rows=[];function visit(value){if(ts.isCallExpression(value)&&ts.isIdentifier(value.expression)&&value.expression.text===name)rows.push(value);ts.forEachChild(value,visit);}visit(node);return rows;}
function boundCall(ts,path,file,call,name){const declaration=one(functions(ts,file,name),name),checker=checkerFor(ts,path,file),symbol=checker.getSymbolAtLocation(declaration.name);if(!symbol||checker.getSymbolAtLocation(call.expression)!==symbol)fail('actual private call binding differs: '+name);}
function hashCalls(ts,path,source){const rows=[];function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['update','digest'].includes(node.expression.name.text))rows.push(node.getText());ts.forEachChild(node,visit);}visit(parse(ts,path,source));return rows;}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
function equation(ts,root,path,before,language,after,nativeSelections){
 const sequence={languageRules:[rule(before,language,'javascript:retain-existing-issuer-and-compose-only-proof-DATA-bytes')],repositoryRules:[rule(language,after,'router:bind-existing-operation-byte-bridge-and-internal-scope')]},first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),stages=[];let document=first.document;
 for(const phase of ['language','repository']){
  const from=phase==='language'?before:language,to=phase==='language'?language:after,beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);if(fresh.source!==from)fail('complete phase input differs');
  const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?sequence.languageRules:[],repositoryRules:phase==='repository'?sequence.repositoryRules:[]}),afterMeta=serializeConcreteSyntaxMeta(run.value),readback=transportConcreteSyntaxMeta(afterMeta);if(readback.source!==to)fail('complete phase output differs');
  const inverse=applyConcreteSyntaxSubstitutions(readback.document,{languageRules:phase==='language'?[rule(to,from,'javascript:restore-complete-original-issuer-source')]:[],repositoryRules:phase==='repository'?[rule(to,from,'router:restore-complete-original-import-and-entry')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==from)fail('complete phase inverse differs');
  stages.push({phase,before:from,after:to,beforeMeta,afterMeta,trace:run.trace,completeInverse:true});document=readback.document;
 }
 if(after.split('\n').length>=1000)fail('complete output must remain below1000lines');
 const originalHashCalls=hashCalls(ts,path,before);if(JSON.stringify(originalHashCalls)!==JSON.stringify(hashCalls(ts,path,after)))fail('original Hash.update/digest call source differs');
 return {path,before,language,after,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,sequence,stages,trace:stages.flatMap(stage=>stage.trace),nativeSelections,nativeCopies:[nativeCopy(ts,path,before),nativeCopy(ts,path,after)],nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),originalHashCalls,semanticAuthority:false};
}
function consumer(ts,path,before){
 const file=parse(ts,path,before),imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&['./private-native-proof-json.mjs','./private-frozen-json.mjs'].includes(node.moduleSpecifier.text)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(row=>['createScopedPrivateNativeProofJsonSerializer','createPrivateFrozenJsonComposer'].includes((row.propertyName??row.name).text))),owner=one(imports,path),bindings=owner.importClause.namedBindings.elements;
 if(owner.importClause.name||bindings.length!==1||!['createScopedPrivateNativeProofJsonSerializer','createPrivateFrozenJsonComposer'].includes((bindings[0].propertyName??bindings[0].name).text))fail('complete actual serializer import binding differs');
 const edits=[selection(file,owner.moduleSpecifier,JSON.stringify('./operation-proof-byte-bridge.mjs'),'same-bridge-serializer-factory')];return {language:apply(before,edits),edits,bindings:bindings.map(node=>node.getText(file))};
}
function entry(ts,root,path,before,name,callee,expected){
 const absolute=resolve(root,path),file=parse(ts,absolute,before),owner=one(functions(ts,file,name),name),call=one(calls(ts,owner,callee),callee);if(call.getText(file)!==expected)fail('complete actual creator call differs: '+name);boundCall(ts,absolute,file,call,callee);
 const languageEdits=[selection(file,call,'withDefaultProofByteConsumers(()=>'+expected+')','same-private-issuer-call')],language=apply(before,languageEdits),imported="import {withDefaultProofByteConsumers} from './default-proof-byte-operation.mjs';\n",at=one(functions(ts,parse(ts,absolute,language),name),name).getFullStart();
 const repositoryEdits=[{kind:'internal-byte-only-scope-import',span:[at,at],expected:'',replacement:'\n'+imported}];return {language,after:apply(language,repositoryEdits),edits:languageEdits,repositoryEdits,originalCall:expected,originalEntry:owner.getText(file)};
}
function producer(ts,path,before){
 const file=parse(ts,path,before),owner=one(functions(ts,file,'relocated'),'actual consumer relocation'),matches=[];function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(file)==="serializers&&(owner==='./private-native-proof-json.mjs'||owner==='./private-frozen-json.mjs')")matches.push(node.expression);ts.forEachChild(node,visit);}visit(owner);
 const condition=one(matches,'complete exact serializer condition'),replacement="serializers&&(owner==='./private-native-proof-json.mjs'||owner==='./private-frozen-json.mjs'||owner==='./operation-proof-byte-bridge.mjs')",edits=[selection(file,condition,replacement,'retain-exact-already-adopted-consumer-census')];return {language:apply(before,edits),edits};
}
export function prepareDefaultProofByteAdoption({root=ROOT}={}){
 root=resolve(root);const ts=compiler(root);
 const {archive,originals}=originalInputs(root);
 const prerequisiteInputs=PREREQUISITES.map(name=>{const row=originals.get(BASE+name);if(!row||sourceAt(root,row.path)!==row.source)fail('complete actual byte bridge prerequisite differs');return row;});
 const fragment=readFileSync(resolve(root,FRAGMENT),'utf8');if(hash(fragment)!==FRAGMENT_PIN)fail('complete authored internal adapter differs');parse(ts,HELPER,fragment);
 const schemars=prepareSchemarsEnclosingAdoption({root}),schemarsRow=one(schemars.files.filter(row=>row.path===ENCLOSING),'complete Schemars import predecessor');if(schemarsRow.before!==originals.get(ENCLOSING).source)fail('complete original Schemars birth differs');
 const files=[];for(const name of CONSUMERS){const path=BASE+name,before=originals.get(path).source,result=consumer(ts,path,before);files.push({...equation(ts,root,path,before,result.language,result.language,result.edits),serializerBindings:result.bindings});}
 for(const [path,before,name,callee,expected]of [[ENCLOSING,schemarsRow.after,'createDeriveEnclosingNamespaceContext','createUnscopedDeriveEnclosingNamespaceContext','createUnscopedDeriveEnclosingNamespaceContext({deriveContext})'],[DEFAULT,originals.get(DEFAULT).source,'createDefaultEnclosingSourceContext','createDefaultContext','createDefaultContext(deriveContext,input=>resolveDerivedEnclosingSourceBindings({...input,deriveBangContext}))']]){
  const result=entry(ts,root,path,before,name,callee,expected);files.push({...equation(ts,root,path,before,result.language,result.after,result.edits),repositorySelections:result.repositoryEdits,originalEntry:result.originalEntry,originalCall:result.originalCall});
 }
 files.push(equation(ts,root,HELPER,'',fragment,fragment,[{kind:'complete-authored-internal-byte-scope',span:[0,0],expected:'',replacement:fragment}]));
 const producerBefore=originals.get(PRODUCER).source,updatedProducer=producer(ts,PRODUCER,producerBefore);files.push(equation(ts,root,PRODUCER,producerBefore,updatedProducer.language,updatedProducer.language,updatedProducer.edits));
 for(const row of files){row.current=sourceAt(root,row.path);const allowed=[row.before,row.after];if(row.path===ENCLOSING)allowed.push(schemarsRow.before);if(row.path===HELPER)allowed.push(null);if(!allowed.includes(row.current))fail('complete physical source differs from explicit historical/final layers: '+row.path);}
 if(hash(readFileSync(resolve(root,ARCHIVE)))!==ARCHIVE_PIN||readFileSync(resolve(root,FRAGMENT),'utf8')!==fragment)fail('complete source inputs changed during operation');for(const row of prerequisiteInputs)if(sourceAt(root,row.path)!==row.source)fail('complete byte bridge source changed during operation');for(const row of files)if(sourceAt(root,row.path)!==row.current)fail('complete target source changed during operation');
 return {schema:'default-operation-proof-byte-adoption-v1',typescriptVersion:ts.version,historicalLayers:[schemars],inputs:archive.files,prerequisiteInputs,fragment:{path:FRAGMENT,source:fragment,sha256:FRAGMENT_PIN},files,sameOriginalPrivateIssuers:true,classicCreatorUnchanged:true,originalSourceOwnerAndHashCallsUnchanged:true,originalJsonBytesAndFallbacksRequired:true,diagnosticWarmingCountersMayDiffer:true,newAcrossInvocationEncodedCache:false,semanticAuthority:false,performanceQualified:false,runtimeExecuted:false,requiredRegeneration:['prepare-batched-proof-byte-source-candidate.mjs','current-whole-owner-proof-byte-provider.mjs complete candidate closure'],defaultAdoptionProposed:true};
}
// Exact history for the existing enclosing source pin. This reissues the same
// native selection/equation only, not the unrelated eight proposal rows.
export function prepareDefaultProofByteEnclosingHistory({root=ROOT}={}){
 root=resolve(root);const ts=compiler(root),{archive,originals}=originalInputs(root),schemars=prepareSchemarsEnclosingAdoption({root}),birth=one(schemars.files.filter(row=>row.path===ENCLOSING),'complete Schemars history predecessor');if(birth.before!==originals.get(ENCLOSING).source)fail('complete original Schemars birth differs');
 const fragment=readFileSync(resolve(root,FRAGMENT),'utf8');if(hash(fragment)!==FRAGMENT_PIN)fail('complete authored internal adapter differs');const helper=sourceAt(root,HELPER);if(helper!==null&&helper!==fragment)fail('complete current internal adapter differs');
 const prerequisiteInputs=PREREQUISITES.map(name=>{const row=originals.get(BASE+name);if(!row||sourceAt(root,row.path)!==row.source)fail('complete current byte bridge prerequisite differs');return row;});
 const result=entry(ts,root,ENCLOSING,birth.after,'createDeriveEnclosingNamespaceContext','createUnscopedDeriveEnclosingNamespaceContext','createUnscopedDeriveEnclosingNamespaceContext({deriveContext})'),row={...equation(ts,root,ENCLOSING,birth.after,result.language,result.after,result.edits),repositorySelections:result.repositoryEdits,originalEntry:result.originalEntry,originalCall:result.originalCall,current:sourceAt(root,ENCLOSING)};
 if(![birth.before,row.before,row.after].includes(row.current))fail('complete physical enclosing source differs from exact import/wrapper history');if(row.current===row.after&&helper!==fragment)fail('complete installed byte wrapper helper is absent');if(row.inverse!==birth.after)fail('complete wrapper inverse differs from import predecessor');
 if(hash(readFileSync(resolve(root,ARCHIVE)))!==ARCHIVE_PIN||readFileSync(resolve(root,FRAGMENT),'utf8')!==fragment||sourceAt(root,HELPER)!==helper||sourceAt(root,ENCLOSING)!==row.current)fail('complete enclosing history inputs changed');for(const input of prerequisiteInputs)if(sourceAt(root,input.path)!==input.source)fail('complete enclosing history byte bridge changed');
 return {schema:'default-operation-proof-byte-enclosing-history-v1',typescriptVersion:ts.version,historicalLayers:[schemars],inputs:archive.files,prerequisiteInputs,fragment:{path:FRAGMENT,source:fragment,sha256:FRAGMENT_PIN},files:[row],semanticAuthority:false,performanceQualified:false,runtimeExecuted:false};
}
// Receiving copies have separate private tables. They compare DATA and native
// call tapes; no context they issue is accepted by the installed issuer.
export function prepareDefaultProofByteReceivingSources({root=ROOT}={}){
 root=resolve(root);const ts=compiler(root),packed=readFileSync(resolve(root,ARCHIVE));if(hash(packed)!==ARCHIVE_PIN)fail('complete receiving archive differs');const raw=gunzipSync(packed,{maxOutputLength:1048576});if(hash(raw)!==RAW_PIN)fail('complete receiving sources differ');const archive=JSON.parse(new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw)),schemars=prepareSchemarsEnclosingAdoption({root}),files=[];
 for(const path of [ENCLOSING,DEFAULT]){
  const archived=one(archive.files.filter(row=>row.path===path),'complete receiving original'),before=path===ENCLOSING?one(schemars.files.filter(row=>row.path===path),'complete receiving Schemars predecessor').after:archived.source;
  if(hash(archived.source)!==archived.sha256)fail('complete receiving source/hash join differs');const file=parse(ts,path,before),edits=[];
  for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.'))edits.push(selection(file,node.moduleSpecifier,JSON.stringify(new URL(node.moduleSpecifier.text,pathToFileURL(resolve(root,path))).href),'complete-receiving-original-import'));
  function visit(node){if(ts.isPropertyAccessExpression(node)&&node.name.text==='url'&&ts.isMetaProperty(node.expression)&&node.expression.keywordToken===ts.SyntaxKind.ImportKeyword)edits.push(selection(file,node,JSON.stringify(pathToFileURL(resolve(root,path)).href),'complete-receiving-original-source-root'));ts.forEachChild(node,visit);}visit(file);
  const language=apply(before,edits),after=language+'\n// Separate receiving tables; no private issuer transfer.\n';files.push(equation(ts,root,path,before,language,after,edits));
 }
 if(hash(readFileSync(resolve(root,ARCHIVE)))!==ARCHIVE_PIN)fail('complete receiving archive changed');return {schema:'default-operation-proof-byte-receiving-sources-v1',files,semanticAuthority:false,performanceQualified:false};
}
export function prepareDefaultProofBytePreEntryProbe({root=ROOT}={}){
 root=resolve(root);const ts=compiler(root),before=readFileSync(resolve(root,FRAGMENT),'utf8');if(hash(before)!==FRAGMENT_PIN)fail('complete original adapter differs');const file=parse(ts,HELPER,before),owner=one(file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./operation-proof-byte-bridge.mjs'),'complete internal bridge import');
 const stub="export function withOperationProofByteConsumerBridge(){throw new TypeError('receiving-only pre-entry refusal');}\n",url='data:text/javascript;base64,'+Buffer.from(stub).toString('base64'),edits=[selection(file,owner.moduleSpecifier,JSON.stringify(url),'receiving-only-bridge-pre-entry-refusal')],language=apply(before,edits),after=language+'\n// No source or owner authority.\n';parse(ts,'default-byte-pre-entry-stub.mjs',stub);
 return {schema:'default-operation-proof-byte-pre-entry-probe-v1',file:equation(ts,root,HELPER,before,language,after,edits),stub:{source:stub,nativeCopy:nativeCopy(ts,'default-byte-pre-entry-stub.mjs',stub)},semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');const plan=prepareDefaultProofByteAdoption();
 if(args[0]==='--write'){for(const row of plan.files){if(sourceAt(ROOT,row.path)!==row.current)fail('complete physical source changed before explicit write');writeFileSync(resolve(ROOT,row.path),row.after);}}
 else if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete native-produced default source is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false,runtimeExecuted:false,performanceQualified:false}));
}
