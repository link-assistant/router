// Copy the actual byte detacher into the complete native retention closure.
// Source proposals are DATA; native guards, bounds and semantic checks remain.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareNativeOutputTextRetention,assertNativeOutputTextInputsFresh} from './prepare-native-output-text-retention.mjs';
import {deriveByteOutputTextSource} from './prepare-byte-output-text.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Flat native output source: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one complete native '+label+' required');return rows[0];};
const routes=new Map([
 ['private-native-output-text.mjs','private-flat-native-output-text.mjs'],
 ['native-retained-owned-field-bulk.mjs','flat-native-retained-owned-field-bulk.mjs'],
 ['native-retained-owned-field-matrix-bulk.mjs','flat-native-retained-owned-field-matrix-bulk.mjs'],
 ['isolated-native-retained-owned-field-matrix-bulk.mjs','isolated-flat-native-retained-owned-field-matrix-bulk.mjs'],
 ['native-owned-field-isolated-matrix-session.mjs','flat-native-owned-field-isolated-matrix-session.mjs'],
 ['native-owned-field-isolated-matrix-profile.mjs','flat-native-owned-field-isolated-matrix-profile.mjs'],
 ['translate-router-native-owned-field-meta.mjs','translate-router-flat-native-owned-field-meta.mjs'],
]);
function renamed(path){const at=path.lastIndexOf('/')+1,name=path.slice(at);return routes.has(name)?path.slice(0,at)+routes.get(name):path;}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('whole native grammar: '+path);return file;}
function edits(source,rows){
 let result=source,last=source.length;
 for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('overlap or changed native span');result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);last=row.span[0];}
 return result;
}
function equation(ts,path,before,language,after,current,selections){
 const rule=(a,b,id)=>({id,edits:a===b?[]:[{span:[0,a.length],expected:a,replacement:b}]});
 let document=transportConcreteSyntaxSource(before,{language:'JavaScript'}).document;const stages=[];
 for(const [phase,left,right]of [['language',before,language],['repository',language,after]]){
  const beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);
  if(fresh.source!==left)fail('whole phase input differs');
  const sequence={languageRules:phase==='language'?[rule(left,right,'javascript:copy-actual-flat-UTF16-detacher')]:[],repositoryRules:phase==='repository'?[rule(left,right,'router:route-complete-private-flat-output-closure')]:[]};
  const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),checked=transportConcreteSyntaxMeta(afterMeta);
  if(checked.source!==right)fail('whole phase result differs');
  const inverse=applyConcreteSyntaxSubstitutions(checked.document,{languageRules:phase==='language'?[rule(right,left,'javascript:restore-complete-original-source')]:[],repositoryRules:phase==='repository'?[rule(right,left,'router:restore-complete-native-source')]:[]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==left)fail('whole phase inverse differs');
  stages.push({phase,before:left,after:right,beforeMeta,afterMeta,inverse:left,completeInverse:true,trace:run.trace});document=checked.document;
 }
 parse(ts,path,after);if(after.split('\n').length>=1000)fail('whole source line budget');
 return {path,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),inverse:before,stages,selections,nativeBindings:verifyNativeCopiedSourceBindings(ts,path,after),sourceAuthority:false,semanticAuthority:false};
}
function copiedDetacher(ts,byteSource,nativeSource){
 const file=parse(ts,P+'private-byte-output-text.mjs',byteSource),original=parse(ts,P+'private-native-output-text.mjs',nativeSource);
 const node=one(file.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='detached'),'byte detacher');
 const target=one(original.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='detached'),'native detacher');
 const mapping=new Map([['byteReady','nativeOutputReady'],['byteApply','nativeOutputApply'],['byteFrom','nativeOutputFrom'],['RetainedByteBuffer','NativeOutputBuffer'],['byteToString','nativeOutputToString']]);
 const substitutions=[];function visit(value){if(ts.isIdentifier(value)&&mapping.has(value.text))substitutions.push({span:[value.getStart(file)-node.body.getStart(file),value.end-node.body.getStart(file)],expected:value.getText(file),replacement:mapping.get(value.text)});ts.forEachChild(value,visit);}visit(node.body);
 if(substitutions.length!==7)fail('all seven complete byte-kernel references required');
 const body=edits(node.body.getText(file),substitutions);
 return {source:node.getText(file),body,substitutions,targetSpan:[target.body.getStart(original),target.body.end],targetBody:target.body.getText(original),libraryInternalsUnchanged:true};
}
const header='// Generated by prepare-flat-native-output-text-retention.mjs; bounded flat UTF16 storage.\n';
const headed=source=>source.startsWith('#!')?source.slice(0,source.indexOf('\n')+1)+header+source.slice(source.indexOf('\n')+1):header+source;
function releaseOwnedProjectStorage(ts,path,source){
 const file=parse(ts,path,source),roots=[],loops=[];
 function owner(node){for(let parent=node.parent;parent;parent=parent.parent)if(ts.isFunctionDeclaration(parent))return parent.name?.text;return null;}
 function visit(node){
  if(owner(node)==='planRegeneration'&&ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(file)==='expected.set'&&node.expression.arguments.length===2&&node.expression.arguments[0].getText(file)==='targets.meta'&&node.expression.arguments[1].getText(file)==='storage.text')roots.push(node);
  if(owner(node)==='planRegeneration'&&ts.isForOfStatement(node)&&node.expression.getText(file)==='storage.components')loops.push(node);
  ts.forEachChild(node,visit);
 }visit(file);
 const root=one(roots,'owned project root transfer'),loop=one(loops,'owned component transfers'),body=loop.statement;
 if(!ts.isVariableDeclarationList(loop.initializer)||loop.initializer.declarations.length!==1||loop.initializer.declarations[0].name.getText(file)!=='component'||!ts.isExpressionStatement(body)||!ts.isCallExpression(body.expression)||body.expression.expression.getText(file)!=='expected.set'||body.expression.arguments.length!==2||body.expression.arguments[0].getText(file)!=='component.path'||body.expression.arguments[1].getText(file)!=='component.text')fail('whole original owned component transfer differs');
 const selections=[{span:[root.end,root.end],expected:'',replacement:'\n    storage.text=undefined;'},{span:[body.getStart(file),body.end],expected:body.getText(file),replacement:'{'+body.getText(file)+' component.text=undefined;}'}];
 return {source:edits(source,selections),selections,onlyAfterSynchronousOwnedTransfer:true,allOriginalCapsAndAPIsUnchanged:true};
}
function releaseOwnedProjectContexts(ts,path,source,translator){
 const file=parse(ts,path,source),entry=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='planRegeneration'),'complete planner'),ends=entry.body.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(file)==='progress'&&node.expression.arguments.length===1&&node.expression.arguments[0].getText(file)==="{stage:'standalone',state:'end',completed:completedSources,total:paths.length}"),end=one(ends,'complete standalone end');
 const absolute=resolve(path),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'},checker=ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker(),bindings=[];
 for(const name of ['projectDeclarations','projectSourceScopes']){
  const declaration=one(entry.body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>ts.isIdentifier(node.name)&&node.name.text===name),'owned '+name);
  if(!ts.isArrayLiteralExpression(declaration.initializer)||declaration.initializer.elements.length||!(declaration.parent.flags&ts.NodeFlags.Const))fail('owned empty const context array required');
  const symbol=checker.getSymbolAtLocation(declaration.name),references=[];if(!symbol)fail('actual owned context symbol missing');
  function visit(node){if(ts.isIdentifier(node)){const binding=ts.isShorthandPropertyAssignment(node.parent)&&node.parent.name===node?checker.getShorthandAssignmentValueSymbol(node.parent):checker.getSymbolAtLocation(node);if(binding===symbol){if(node.end>end.getStart(file))fail('owned context still used after standalone translation');references.push({span:[node.getStart(file),node.end],source:node.parent.getText(file)});}}ts.forEachChild(node,visit);}visit(entry);
  if(references.length!==3||!references.some(row=>row.source.startsWith(name+'.push'))||!references.some(row=>row.source===name))fail('complete original declaration/push/translation context uses differ');bindings.push({name,references,lastUseBefore:end.getStart(file)});
 }
 // The actual consumer only forwards these arrays to its private stage, which
 // selects fresh arrays with filter. It never retains or freezes either input.
 const consumer=parse(ts,'translate.mjs',translator),uses=[];function consumerVisit(node){if(ts.isIdentifier(node)&&['projectDeclarations','projectSourceScopes'].includes(node.text)){
  const parent=node.parent;if(ts.isBindingElement(parent)&&parent.name===node){}else if(ts.isShorthandPropertyAssignment(parent)&&parent.name===node&&ts.isObjectLiteralExpression(parent.parent)&&ts.isCallExpression(parent.parent.parent)&&parent.parent.parent.expression.getText(consumer)==='translateConcreteSyntaxStage'){}else if(ts.isPropertyAccessExpression(parent)&&parent.expression===node&&parent.name.text==='filter'&&ts.isCallExpression(parent.parent)&&parent.parent.expression===parent){}else fail('original consumer may retain or mutate owned context arrays');uses.push({name:node.text,span:[node.getStart(consumer),node.end],source:parent.getText(consumer)});
 }ts.forEachChild(node,consumerVisit);}consumerVisit(consumer);if(uses.length!==8)fail('complete original consumer context reference census differs');
 const selections=[{span:[end.end,end.end],expected:'',replacement:'\n  projectDeclarations.length=0;projectSourceScopes.length=0;'}];return {source:edits(source,selections),selections,bindings,consumerUses:uses,onlyAfterLastStandaloneUse:true,noInputArrayEscapes:true,allOriginalCapsAndAPIsUnchanged:true};
}
export async function prepareFlatNativeOutputTextRetention({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const inputs=[],read=path=>{const source=readFileSync(resolve(root,path),'utf8');inputs.push({path,source,sha256:hash(source)});return source;};
 read(P+'prepare-flat-native-output-text-retention.mjs');
 const native=await prepareNativeOutputTextRetention({root});for(const row of native.files)if(read(row.path)!==row.after)fail('actual complete native prerequisite stale: '+row.path);
 const codec=native.files[0],byte=deriveByteOutputTextSource(codec.before);
 if(read(P+'private-byte-output-text.mjs')!==byte.text||byte.inverse!==codec.before)fail('actual original byte producer/inverse differs');
 const detacher=copiedDetacher(ts,byte.text,codec.after),files=[];
 for(const row of native.files){
  const before=row.after,path=renamed(row.path);if(path===row.path)fail('every actual native output requires a declared route');
  let language=row===codec?edits(before,[{span:detacher.targetSpan,expected:detacher.targetBody,replacement:detacher.body}]):before;
  const ownership=row.path===P+'native-retained-owned-field-bulk.mjs'?releaseOwnedProjectStorage(ts,path,language):null;if(ownership)language=ownership.source;
  const contexts=ownership?releaseOwnedProjectContexts(ts,resolve(root,path),language,read(P+'translate.mjs')):null;if(contexts)language=contexts.source;
  const file=parse(ts,path,language),changes=[];function visit(node){if(ts.isStringLiteral(node)){let replacement=renamed(node.text);if(ts.isImportDeclaration(node.parent)&&node.parent.moduleSpecifier===node){if(node.text==='./project.mjs')replacement='./project-flat-semantic.mjs';if(node.text==='./project-meta-field-json.mjs')replacement='./project-meta-field-flat-json.mjs';if(node.text==='./project-meta-compressed-storage.mjs')replacement='./project-meta-consumed-storage.mjs';}if(replacement!==node.text)changes.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:JSON.stringify(replacement)});}if(ts.isImportSpecifier(node)&&!node.propertyName&&node.name.text==='translateProject'&&ts.isImportDeclaration(node.parent.parent.parent)&&node.parent.parent.parent.moduleSpecifier.text==='./project.mjs')changes.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:'translateProjectWithFlatEnclosingSemanticMeta as translateProject'});if(ts.isImportSpecifier(node)&&node.propertyName?.text==='planCompressedProjectMetaUtf8ObjectStorage'&&ts.isImportDeclaration(node.parent.parent.parent)&&node.parent.parent.parent.moduleSpecifier.text==='./project-meta-compressed-storage.mjs')changes.push({span:[node.propertyName.getStart(file),node.propertyName.end],expected:node.propertyName.getText(file),replacement:'planConsumedProjectMetaUtf8ObjectStorage'});ts.forEachChild(node,visit);}visit(file);
  const after=headed(edits(language,changes)),current=existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null;
  files.push(equation(ts,resolve(root,path),before,language,after,current,{literalRoutes:changes,detacher:row===codec?detacher:null,ownedStorageTransfer:ownership,ownedContextRelease:contexts}));
  files.at(-1).path=path;
 }
 const testPath=P+'test/native-output-text-retention.test.mjs',testBefore=read(testPath),testTarget=P+'test/flat-native-output-text-retention.test.mjs',testFile=parse(ts,testPath,testBefore),testEdits=[];
 function visitTest(node){if(ts.isStringLiteral(node)){const replacement=renamed(node.text);if(replacement!==node.text)testEdits.push({span:[node.getStart(testFile),node.end],expected:node.getText(testFile),replacement:JSON.stringify(replacement)});}ts.forEachChild(node,visitTest);}visitTest(testFile);
 const testLanguage=edits(testBefore,testEdits),extra=flatTests();
 const testAfter=header+"import {prepareFlatNativeOutputTextRetention} from '../prepare-flat-native-output-text-retention.mjs';\n"+testLanguage+extra;
 const testCurrent=existsSync(resolve(root,testTarget))?readFileSync(resolve(root,testTarget),'utf8'):null;
 files.push(equation(ts,resolve(root,testTarget),testBefore,testLanguage,testAfter,testCurrent,{literalRoutes:testEdits,completeOriginalSevenCasesCopied:true}));files.at(-1).path=testTarget;
 for(const row of inputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete original input changed');
 assertNativeOutputTextInputsFresh(native);
 return {schema:'flat-native-output-retention-source-v1',files,inputs,nativePrerequisites:native,bytePrerequisite:byte,detacher,originalAPIsUnchanged:true,limitsUnchanged:true,newAcrossInvocationCache:false,rustExecuted:false,performanceQualified:false,semanticAuthority:false};
}
function flatTests(){return '\n'+[
 "test('flat storage copies the actual byte detacher and retains every complete native source inverse',async()=>{",
 " const plan=await prepareFlatNativeOutputTextRetention({root:ROOT});assert.equal(plan.files.length,8);assert.equal(plan.detacher.substitutions.length,7);assert.equal(plan.originalAPIsUnchanged,true);assert.equal(plan.limitsUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);",
 " for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(part=>part.phase),['language','repository']);for(const part of row.stages){assert.equal(transportConcreteSyntaxMeta(part.beforeMeta).source,part.before);assert.equal(transportConcreteSyntaxMeta(part.afterMeta).source,part.after);assert.equal(part.completeInverse,true);}}",
 " const codec=plan.files[0],ts=ownershipCompiler(),before=ts.createSourceFile('before.mjs',codec.before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),after=ts.createSourceFile('after.mjs',codec.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);",
 " for(const node of before.statements.filter(ts.isFunctionDeclaration))if(node.name.text!=='detached'){const found=after.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text===node.name.text);assert.equal(found.length,1);assert.equal(found[0].getText(after),node.getText(before));}",
 " retain('flat-complete-source-plan',plan);",
 "});",
 "test('incompressible UTF16 retention restores all sixteen MiB under the original small diagnostic heap',()=>{",
 " const url=pathToFileURL(join(ROOT,P+'private-flat-native-output-text.mjs')).href;",
 " const source=\"import {createPrivateOutputTextRetention} from \"+JSON.stringify(url)+\";import {createHash} from 'node:crypto';const raw=Buffer.allocUnsafe(16*1024*1024);let s=0x7590772;for(let i=0;i<raw.length;i+=2){s^=s<<13;s^=s>>>17;s^=s<<5;raw.writeUInt16LE(s&65535,i);}const text=raw.toString('utf16le'),store=createPrivateOutputTextRetention(),cell=store.retain(text),restored=store.restore(cell);if(restored!==text)throw Error('complete UTF16 differs');console.log(JSON.stringify({bytes:raw.length,units:restored.length,sha256:createHash('sha256').update(Buffer.from(restored,'utf16le')).digest('hex'),node:process.versions.node}));\";",
 " const output=execFileSync('node',['--max-old-space-size=96','--input-type=module','-e',source],{encoding:'utf8',timeout:20000,maxBuffer:1048576}),result=JSON.parse(output);assert.equal(result.bytes,16777216);assert.equal(result.units,8388608);assert.equal(result.sha256,'422912e8da75056bf42e2d38e42c598019bb79a671bb8f888f5b189307876800');retain('flat-small-heap-complete-result',{source,result});",
 "});",
 ].join('\n')+'\n';}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--write','--check'].includes(mode))fail('use --write|--check');
 const plan=await prepareFlatNativeOutputTextRetention();
 for(const row of plan.files)if((existsSync(resolve(ROOT,row.path))?readFileSync(resolve(ROOT,row.path),'utf8'):null)!==row.current)fail('current complete output changed');
 if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete generated flat output is stale');
 if(mode==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),originalAPIsUnchanged:true,limitsUnchanged:true,rustExecuted:false}));
}
