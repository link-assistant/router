// Complete source equations only. Private source/semantic issuers stay ordinary.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';
import {deriveProjectMethodOwnerScope} from './project-method-owner-scope-source.mjs';
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE=new URL('./source-profiles/project-facade-retention/',import.meta.url);
const PATH='tools/translation/project.mjs';
const MANIFEST='435847f54eceedb2506b10cac8cfab73e44a81f75b5044952792a920eaba3b3e';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project facade retention source: '+message);};
function original(){
 const bytes=readFileSync(new URL('manifest.json',PROFILE));if(hash(bytes)!==MANIFEST)fail('complete original manifest differs');
 const row=JSON.parse(bytes),packed=readFileSync(new URL(row.archive,PROFILE));
 if(row.schema!=='project-facade-retention-original-v1'||row.path!==PATH||packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:262144});
 if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('complete original bytes differ');
 const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(hash(source)!==row.sha256)fail('complete original Unicode differs');return {...row,source};
}
function parse(ts,source){
 const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native grammar or line budget differs');return file;
}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function nativeCopy(ts,source){
 const file=parse(ts,source),clear=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,clear);};
 const nodes=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);clear(copy);return copy;});
 const copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,nodes));
 if(JSON.stringify(shape(ts,file))!==JSON.stringify(shape(ts,parse(ts,copy))))fail('complete detached native AST differs');return {source,copy,completeNativeAstCopy:true};
}
function derive(ts,before){
 const file=parse(ts,before),lowers=[],accessors=[],names=new Set();
 function visit(node){
  if(ts.isIdentifier(node))names.add(node.text);
  if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='lowerDeclaration')lowers.push(node);
  if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='checkedSource')accessors.push(node);
  ts.forEachChild(node,visit);
 }
 visit(file);
 if(lowers.length!==1||accessors.length!==1||names.has('createProjectLowerer')||names.has('createProjectCheckedSource'))fail('complete original closure selection differs');
 const lower=lowers[0].initializer,accessor=accessors[0].initializer;
 if(!ts.isArrowFunction(lower)||!ts.isFunctionExpression(lower.body)||!ts.isArrowFunction(accessor)||accessor.parameters.length)fail('original callable grammar differs');
 const edits=[{span:[lower.getStart(file),lower.end],expected:lower.getText(file),replacement:'(entry,name)=>createProjectLowerer(target,entry,name)'},{span:[accessor.getStart(file),accessor.end],expected:accessor.getText(file),replacement:'createProjectCheckedSource(checked,{modules:graph.modules},entry)'}].sort((a,b)=>a.span[0]-b.span[0]);
 let language=before;for(const edit of [...edits].reverse())language=language.slice(0,edit.span[0])+edit.replacement+language.slice(edit.span[1]);
 const helpers='\nfunction createProjectLowerer(target,entry,name){return '+lower.body.getText(file)+';}\n'+'function createProjectCheckedSource(checked,graph,entry){const facade={checkedSource:'+accessor.getText(file)+'};return facade.checkedSource;}\n';
 // The original returned function/arrow text, names and arities are preserved.
 // The checked-source reader still examines the live, complete module array.
 const after=language+helpers;parse(ts,language);parse(ts,after);
 let inverse=language,shift=0;const positioned=edits.map(edit=>{const position=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,position};});
 for(const edit of positioned.reverse()){if(inverse.slice(edit.position,edit.position+edit.replacement.length)!==edit.replacement)fail('selected native inverse differs');inverse=inverse.slice(0,edit.position)+edit.expected+inverse.slice(edit.position+edit.replacement.length);}
 if(inverse!==before)fail('complete native inverse differs');
 return {language,after,selection:{edits,helpers,lowerFunction:lower.body.getText(file),checkedSourceFunction:accessor.getText(file),completeNativeInverse:inverse,liveModuleArrayRetained:true}};
}
export function prepareProjectFacadeRetention({root=ROOT}={}){
 root=resolve(root);const input=original(),before=input.source,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const retained=derive(ts,before),methodOwnerScope=deriveProjectMethodOwnerScope(ts,retained.language),language=methodOwnerScope.after;
 const previousAfter=language+retained.selection.helpers;
 const namespaceComposition=derivePinnedRepositorySourceEvolution(ts,{
  profile:new URL('./source-profiles/project-namespace-composition/source-rules.json',import.meta.url),
  profileSha256:'67fe9db0a517b6050ff9117a59c427ba880272e93a9fa90417ad61affcd74730',
  path:PATH,source:previousAfter,
 });
 const namespaceObserver=derivePinnedRepositorySourceEvolution(ts,{
  profile:new URL('./source-profiles/namespace-progress-observer/0-rules.json',import.meta.url),
  profileSha256:'23eabe8f329efc2534b7da89442c3273fea75056b1d05469987124ef7ff5cf46',path:PATH,source:namespaceComposition.after,
 });
  const ingressBoundary=derivePinnedRepositorySourceEvolution(ts,{
   profile:new URL('./source-profiles/project-ingress-native-boundary/source-rules.json',import.meta.url),
   profileSha256:'f72a45665a7592f6047daad51a082ff0a11d5b9614a699be562a480e4bac76ff',path:PATH,source:namespaceObserver.after,
  });
  const after=ingressBoundary.after;
 if(methodOwnerScope.inverse!==retained.language||retained.selection.completeNativeInverse!==before)fail('complete composed native inverse differs');
 if(ingressBoundary.inverse!==namespaceObserver.after||namespaceObserver.inverse!==namespaceComposition.after||namespaceComposition.inverse!==previousAfter)fail('complete namespace composition inverse differs');
 const selection={...retained.selection,methodOwnerScope,namespaceComposition,namespaceObserver,ingressBoundary},current=readFileSync(resolve(root,PATH),'utf8');
 if(current!==before&&current!==retained.after&&current!==previousAfter&&current!==namespaceComposition.after&&current!==namespaceObserver.after&&current!==after)fail('complete physical project is neither original nor an exact derived output');
 const [equation]=transportConcreteSourcePhases([{before,middle:language,after,language:'JavaScript'}]);
 const stages=equation.stages.map(stage=>({...stage,completeInverse:true}));
 const nativeCopies=[nativeCopy(ts,before),nativeCopy(ts,after)],nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,PATH),after);
 if(readFileSync(resolve(root,PATH),'utf8')!==current||original().source!==before)fail('complete source changed across final boundary');
 return {schema:'project-facade-retention-source-v1',typescriptVersion:ts.version,input,files:[{path:PATH,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:equation.beforeMeta,afterMeta:equation.afterMeta,inverse:before,stages,trace:equation.trace,nativeCopies,nativeBindings,selection}],sourceAuthority:false,semanticAuthority:false};
}
export function composeProjectFacadeRetention(prior,options={}){
 const plan=prepareProjectFacadeRetention(options),sources={...prior};
 for(const row of plan.files){if(!sources[row.path]||sources[row.path].after!==row.before)fail('preceding complete project equation differs');sources[row.path]=row;}
 return {sources,layers:[plan],historicalSources:prior};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--write','--check'].includes(mode))fail('use --write|--check');
 const plan=prepareProjectFacadeRetention();
 for(const row of plan.files){
  if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('complete physical project changed before installation');
  if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);else if(row.current!==row.after)fail('complete generated source is stale');
 }
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
}
