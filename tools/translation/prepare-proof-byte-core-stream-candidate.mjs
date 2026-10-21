import {prepareSchemarsCoreDispatcherRoute,completeSchemarsCoreEnclosingRoutes} from './proof-byte-core-schemars-route.mjs';
// Distinct, source-only coherent Core stream closure. Existing defaults stay exact.
import {readFileSync,writeFileSync,existsSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareWholeOwnerProofByteCandidate} from "./current-whole-owner-proof-byte-provider.mjs";
import {prepareWholeOwnerCoreCorpusCandidate} from './prepare-whole-owner-core-corpus-candidate.mjs';
import {assertConcreteSyntaxHost,transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {substitutePrivateConcreteSourceBatches} from './private-concrete-substitution-batch-candidate.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/';
const COPIES=[
 ['whole-owner-enclosing-context-candidate.mjs','proof-byte-core-enclosing-candidate.mjs'],
 ['whole-owner-core-module-bindings-candidate.mjs','proof-byte-core-bindings-candidate.mjs'],
 ['whole-owner-core-adoption-producer-context-candidate.mjs','proof-byte-core-adoption-candidate.mjs'],
 ['whole-owner-core-producer-candidate.mjs','proof-byte-core-producer-candidate.mjs'],
 ['whole-owner-core-corpus-inspection-data.mjs','proof-byte-core-corpus-inspection-data.mjs'],
 ...['source-backed-formatting-support','source-backed-core-formatting','source-backed-core-matches','source-backed-core-vectors','core-sequence-stage-source','source-backed-core-sequence-stream'].map(name=>['whole-owner-'+name+'-candidate.mjs','proof-byte-core-'+name+'-candidate.mjs']),
 ['whole-owner-core-corpus-candidate.mjs','proof-byte-core-stream-candidate.mjs'],
];
const STREAM='proof-byte-core-source-backed-core-sequence-stream-candidate.mjs',SCHEMA='router-complete-proof-byte-core-sequence-stream-candidate-v1';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Proof byte Core stream source: '+message);};
function one(rows,label){if(rows.length!==1)fail('one complete actual '+label+' required');return rows[0];}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function detached(ts,node){const copy=ts.getSynthesizedDeepClone(node);function clear(value){ts.setTextRange(value,{pos:-1,end:-1});ts.setOriginalNode(value,undefined);ts.forEachChild(value,clear);}clear(copy);return copy;}
function nativeCopy(ts,path,source){const file=parse(ts,path,source),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,file.statements.map(node=>detached(ts,node))));if(JSON.stringify(shape(ts,parse(ts,path,copy)))!==JSON.stringify(shape(ts,file)))fail('complete detached native AST copy differs');return {source,copy,completeNativeAstCopy:true};}
function apply(source,edits){let after=source,end=source.length+1;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>end||after.slice(...edit.span)!==edit.expected)fail('exact nonoverlapping native selection differs');end=edit.span[0];after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}return after;}
function hashes(ts,file){const calls=[];function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['update','digest'].includes(node.expression.name.text))calls.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return calls;}
function selection(ts,path,before,mapping){
 const file=parse(ts,path,before),edits=[],imports=[];
 for(const node of file.statements){
  if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node)||!node.moduleSpecifier||!ts.isStringLiteral(node.moduleSpecifier)||!mapping.has(node.moduleSpecifier.text))continue;
  const old=node.moduleSpecifier.text,target=mapping.get(old),bindings=[];
  if(ts.isImportDeclaration(node)){
   if(node.importClause?.name||node.importClause?.namedBindings&&!ts.isNamedImports(node.importClause.namedBindings))fail('selected original imports require complete named bindings');
   for(const binding of node.importClause?.namedBindings?.elements??[]){
    const imported=(binding.propertyName??binding.name).text;let requested=imported;
    if(old==='./owned-enclosing-module-bindings.mjs'){
     if(imported!=='resolveOwnedEnclosingNamespaceModuleBindings'||!binding.propertyName)fail('exact original owned resolver alias required');requested='resolveWholeOwnerEnclosingNamespaceModuleBindings';
     edits.push({span:[binding.propertyName.getStart(file),binding.propertyName.end],expected:binding.propertyName.getText(file),replacement:requested});
    }
    bindings.push({imported,requested,local:binding.name.text,span:[binding.name.getStart(file),binding.name.end]});
   }
  }else if(node.exportClause){if(!ts.isNamedExports(node.exportClause))fail('selected original named export required');for(const binding of node.exportClause.elements)bindings.push({imported:(binding.propertyName??binding.name).text,requested:(binding.propertyName??binding.name).text,local:binding.name.text});}
  edits.push({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:node.moduleSpecifier.getText(file),replacement:target===old?node.moduleSpecifier.getText(file):JSON.stringify(target)});imports.push({kind:ts.isImportDeclaration(node)?'import':'export',original:old,target,source:node.getText(file),bindings,star:ts.isExportDeclaration(node)&&!node.exportClause});
 }
 if(path.endsWith('/'+STREAM)){
  const declarations=file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]),schema=one(declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text==='SCHEMA'),'outer stream schema');
  if(!ts.isStringLiteral(schema.initializer)||schema.initializer.text!=='router-complete-whole-owner-core-sequence-stream-candidate-v1')fail('exact actual outer stream schema required');edits.push({span:[schema.initializer.getStart(file),schema.initializer.end],expected:schema.initializer.getText(file),replacement:JSON.stringify(SCHEMA)});
 }
 if(!imports.length)fail('actual selected complete issuer import/export absent: '+path);
 const after=apply(before,edits),native=parse(ts,path,after),preserved=[];
 for(const node of file.statements){
  if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)||path.endsWith('/'+STREAM)&&ts.isVariableStatement(node)&&node.declarationList.declarations.some(value=>ts.isIdentifier(value.name)&&value.name.text==='SCHEMA'))continue;
  const inverse=apply(node.getText(file),edits.filter(edit=>edit.span[0]>=node.getStart(file)&&edit.span[1]<=node.end).map(edit=>({...edit,span:edit.span.map(at=>at-node.getStart(file))})));
  if(inverse!==node.getText(file))fail('original complete nonimport statement changed');preserved.push({span:[node.getStart(file),node.end],source:node.getText(file)});
 }
 if(JSON.stringify(hashes(ts,file))!==JSON.stringify(hashes(ts,native)))fail('complete original Hash call census changed');return {after,edits,imports,preserved,hashCalls:hashes(ts,file)};
}
function row(ts,path,before,choice,root,pending){
const after=choice.after;
if(after.split('\n').length>=1000)fail('complete generated line budget');
const __coreCstRaw={ path, before, after, current: existsSync(resolve(root, path)) ? readFileSync(resolve(root, path), 'utf8') : null, beforeSha256: hash(before), afterSha256: hash(after), beforeMeta: void 0, afterMeta: void 0, inverse: before, stages: void 0, trace: void 0, nativeCopies: [nativeCopy(ts, path, before), nativeCopy(ts, path, after)], completeNativeAstCopy: true, nativeBindings: verifyNativeCopiedSourceBindings(ts, resolve(root, path), after), selection: choice };pending.push({path,before,after,record:__coreCstRaw});return __coreCstRaw;
}
function joinedBindings(ts,root,files){
 const byPath=new Map(files.map(part=>[resolve(root,part.path),part.after])),options={allowJs:true,noLib:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host=ts.createCompilerHost(options),read=host.getSourceFile,exists=host.fileExists,source=host.readFile;
 host.fileExists=path=>byPath.has(resolve(path))||exists(path);host.readFile=path=>byPath.get(resolve(path))??source(path);host.getSourceFile=(path,...args)=>byPath.has(resolve(path))?parse(ts,path,byPath.get(resolve(path))):read(path,...args);
 const program=ts.createProgram([...byPath.keys()],options,host),checker=program.getTypeChecker(),evidence=[];
 for(const part of files){const file=program.getSourceFile(resolve(root,part.path));for(const selected of part.selection.imports){
  const declarations=file.statements.filter(node=>(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier?.text===selected.target);const declaration=declarations.find(node=>selected.kind===(ts.isImportDeclaration(node)?'import':'export')&&(selected.star?!node.exportClause:selected.bindings.every(binding=>ts.isImportDeclaration(node)?node.importClause?.namedBindings?.elements?.some(value=>value.name.text===binding.local):node.exportClause?.elements?.some(value=>value.name.text===binding.local))));if(!declaration)fail('one actual copied native module declaration absent');
  const symbol=checker.getSymbolAtLocation(declaration.moduleSpecifier);if(!symbol)fail('actual copied module symbol absent');const target=resolve(dirname(resolve(root,part.path)),selected.target),exports=checker.getExportsOfModule(symbol),joined=[];
  if(!program.getSourceFile(target)||!symbol.declarations?.some(node=>resolve(node.getSourceFile().fileName)===target))fail('copied native module symbol has foreign original source');
  for(const binding of selected.bindings){const exported=one(exports.filter(value=>value.name===binding.requested),'actual target export '+binding.requested),actual=exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported;if(!actual.declarations?.length)fail('actual target export declaration absent');
   if(ts.isImportDeclaration(declaration)){const spec=one([...declaration.importClause.namedBindings.elements].filter(value=>value.name.text===binding.local),'actual local imported binding'),local=checker.getSymbolAtLocation(spec.name);if(!local||!(local.flags&ts.SymbolFlags.Alias)||checker.getAliasedSymbol(local)!==actual)fail('actual native local alias does not name the selected issuer');}
   joined.push({...binding,declarations:actual.declarations.map(node=>({path:node.getSourceFile().fileName,span:[node.getStart(),node.end],source:node.getText()}))});
  }
  evidence.push({path:part.path,target:target.slice(root.length+1),original:selected.original,bindings:joined,star:selected.star,actualNativeModuleSymbol:true});
 }}return evidence;
}
export function prepareProofByteCoreStreamCandidate({root=ROOT}={}){
const __coreCstPending=[];
function __coreCstRequest(row){const {before,after}=row,rule=(a,b,id)=>({id,edits:[{span:[0,a.length],expected:a,replacement:b}]}),stages=[];for(const phase of ['language','repository']){const from=before,to=phase==='language'?before:after;stages.push({phase,expected:to,sequence:{languageRules:phase==='language'?[rule(from,to,'javascript:complete-actual-current-Core-corpus-copy')]:[],repositoryRules:phase==='repository'?[rule(from,to,'router:coherent-proof-byte-issuer-imports-and-distinct-stream-schema')]:[]},inverseSequence:{languageRules:phase==='language'?[rule(to,from,'javascript:restore-complete-actual-current-template')]:[],repositoryRules:phase==='repository'?[rule(to,from,'router:restore-complete-original-issuer-imports')]:[]}});}return {source:before,language:'JavaScript',stages};}
function __coreCstFinish(files,inputs,prerequisites,root,pending){
 if(files.length!==12||pending.length!==12||new Set(files.map(row=>row.path)).size!==12||pending.some((row,at)=>row.record!==files[at]))fail('complete12 actual raw/native Core rows required');
 const snapshots=prerequisites.map(row=>{const bytes=readFileSync(resolve(root,row.path)),expected=Object.hasOwn(row,'sha256')?row.sha256:Object.hasOwn(row,'source')&&typeof row.source==='string'?hash(row.source):fail('complete prerequisite requires its own SHA or full primitive source');if(hash(bytes)!==expected)fail('complete Core prerequisite changed before all CST chunks: '+row.path);return {path:row.path,bytes};});
 assertConcreteSyntaxHost();for(const row of inputs.values())if(typeof row.source!=='string'||readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete Core input changed before all CST chunks');for(const row of snapshots)if(!readFileSync(resolve(root,row.path)).equals(row.bytes))fail('complete Core prerequisite bytes changed before all CST chunks');
 for(const row of files)if((existsSync(resolve(root,row.path))?readFileSync(resolve(root,row.path),'utf8'):null)!==row.current)fail('complete Core physical output changed before all CST chunks');
 for(let at=0;at<pending.length;at+=3){const requested=pending.slice(at,at+3),batch=substitutePrivateConcreteSourceBatches(requested.map(__coreCstRequest));if(batch.schema!=='private-concrete-source-substitution-batches-v1'||batch.sourceAuthority!==false||batch.runtimeAuthority!==false||batch.rows.length!==requested.length)fail('complete bounded authenticated Core CST chunk differs');for(let index=0;index<requested.length;index++){const raw=requested[index],fragment=JSON.parse(batch.rows[index]),row=raw.record;if(JSON.stringify(Object.keys(fragment))!==JSON.stringify(['beforeMeta','afterMeta','inverse','stages','trace'])||fragment.inverse!==raw.before||fragment.stages.length!==2||fragment.stages[0].phase!=='language'||fragment.stages[0].before!==raw.before||fragment.stages[0].after!==raw.before||fragment.stages[1].phase!=='repository'||fragment.stages[1].before!==raw.before||fragment.stages[1].after!==raw.after||fragment.stages.some(stage=>stage.completeInverse!==true))fail('complete original Core CST row fragment differs');row.beforeMeta=fragment.beforeMeta;row.afterMeta=fragment.afterMeta;row.inverse=fragment.inverse;row.stages=fragment.stages;row.trace=fragment.trace;}}
 assertConcreteSyntaxHost();for(const row of inputs.values())if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete Core input changed after all CST chunks');for(const row of snapshots)if(!readFileSync(resolve(root,row.path)).equals(row.bytes))fail('complete Core prerequisite bytes changed after all CST chunks');for(const row of files)if((existsSync(resolve(root,row.path))?readFileSync(resolve(root,row.path),'utf8'):null)!==row.current)fail('complete Core physical output changed after all CST chunks');
}

 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('actual root native TypeScript5.9.3 required');
 const bytes=prepareWholeOwnerProofByteCandidate({root}),corpus=prepareWholeOwnerCoreCorpusCandidate({root}),core=corpus.coreProducer;
 if([...bytes.files,...core.files,...corpus.files].some(part=>part.current!==part.after))fail('complete current materialized byte19 Core3 and corpus6 required');
 const inputs=new Map();function input(path){if(!inputs.has(path)){const state=lstatSync(resolve(root,path));if(!state.isFile()||state.isSymbolicLink()||state.size>2*1024*1024)fail('bounded regular complete source required');const source=readFileSync(resolve(root,path),'utf8');inputs.set(path,{path,source,sha256:hash(source)});}return inputs.get(path).source;}
 const mapping=new Map(COPIES.map(([before,after])=>['./'+before,'./'+after]));
 for(const part of bytes.files){const physical=part.selection.physicalPath,sourcePath=part.selection.sourcePath;if(!physical||!sourcePath)continue;for(const path of [physical,sourcePath])mapping.set('./'+path.slice(BASE.length),'./'+part.path.slice(BASE.length));}
 mapping.set('./derive-enclosing-namespace-context.mjs','./proof-byte-core-enclosing-candidate.mjs');mapping.set('./module-bindings.mjs','./proof-byte-core-bindings-candidate.mjs');mapping.set('./owned-enclosing-module-bindings.mjs','./proof-byte-core-bindings-candidate.mjs');
 const schemarsCoreRoute=prepareSchemarsCoreDispatcherRoute({root,ts,input,mapping});
 const files=COPIES.map(([before,after])=>{const source=input(BASE+before),path=BASE+after;return row(ts,path,source,selection(ts,path,source,mapping),root,__coreCstPending);});
 const nativeIssuerBindings=joinedBindings(ts,root,files),enclosing=files[0],routes=completeSchemarsCoreEnclosingRoutes(enclosing,nativeIssuerBindings,schemarsCoreRoute);
 if(routes.length!==8||new Set(routes.map(part=>part.target)).size!==6)fail('all seven selected enclosing owner/operation routes and late builtin binding required');
 const ownedAlias=one(files[2].selection.imports.filter(part=>part.original==='./owned-enclosing-module-bindings.mjs'),'owned resolver alias');if(ownedAlias.bindings.length!==1||ownedAlias.bindings[0].requested!=='resolveWholeOwnerEnclosingNamespaceModuleBindings')fail('exact source-derived owned resolver alias required');
 const bindingBirth=one(core.files.filter(part=>part.path===BASE+'whole-owner-core-module-bindings-candidate.mjs'),'current complete Core resolver birth');if(!bindingBirth.selection.originalOwnedWrapper||!bindingBirth.selection.newOwnedWrapper)fail('complete original/native-derived owned resolver equations required');
 input(BASE+'prepare-proof-byte-core-stream-candidate.mjs');const plans=[bytes,bytes.operationProducer,bytes.resolverProducer,bytes.resolverProducer.wholeOwnerProducer,core,corpus,...corpus.originalTemplateProducers],prerequisites=[...bytes.currentProviderInputs,...bytes.prerequisiteInputs,bytes.operationProducer.input,...plans.flatMap(plan=>[...(plan.inputs??[]),...plan.files.map(part=>({path:part.path,sha256:hash(part.after)}))]),...schemarsCoreRoute.prerequisites];
__coreCstFinish(files,inputs,prerequisites,root,__coreCstPending);

 for(const part of [...inputs.values(),...prerequisites])if(hash(readFileSync(resolve(root,part.path)))!==(Object.hasOwn(part,'sha256')?part.sha256:Object.hasOwn(part,'source')&&typeof part.source==='string'?hash(part.source):fail('complete prerequisite requires its own SHA or full primitive source')))fail('complete current source prerequisite changed: '+part.path);
 return {schema:'proof-byte-Core-stream-source-candidate-v1',typescriptVersion:ts.version,inputs:[...inputs.values()],prerequisites,files,nativeIssuerBindings,enclosingRoutes:routes,ownedResolverEquation:bindingBirth.selection,byteProducer:bytes,coreProducer:core,corpusProducer:corpus,stream:{path:BASE+STREAM,schema:SCHEMA},originalDefaultsUnchanged:true,originalFallbackUnchanged:true,originalHashCallsUnchanged:true,foreignProofsRebound:false,newAcrossInvocationCache:false,productionSelected:false,semanticAdmission:false,runtimeExecuted:false,performanceQualified:false,schemarsCoreRoute};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');const plan=prepareProofByteCoreStreamCandidate();
 if(mode==='--write'){for(const part of plan.files){const current=existsSync(resolve(ROOT,part.path))?readFileSync(resolve(ROOT,part.path),'utf8'):null;if(current!==part.current)fail('complete current output changed');}for(const part of plan.files)writeFileSync(resolve(ROOT,part.path),part.after);}
 else if(mode==='--check'&&plan.files.some(part=>part.current!==part.after))fail('complete generated proof-byte Core stream is stale');console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(part=>part.path),productionSelected:false,runtimeExecuted:false,performanceQualified:false}));
}
