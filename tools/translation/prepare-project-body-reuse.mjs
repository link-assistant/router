// Eliminate standalone body results overwritten by the existing project join.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/project-body-reuse/complete-originals.json.gz';
const PIN='d24e59743ed080e8929619742d4a99711948a2bbd0800db1dc15880c74e7f871';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project body reuse source: '+message);};
function one(rows,label){if(rows.length!==1)fail('one native '+label+' required');return rows[0];}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('whole native syntax/line bound');return file;}
function apply(source,rows){let after=source,last=source.length+1;for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('native source selection differs');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);last=row.span[0];}return after;}
const importClause="if(ts.isImportSpecifier(node)&&!node.propertyName&&node.name.text==='translateSource'&&ts.isImportDeclaration(node.parent.parent.parent)&&node.parent.parent.parent.moduleSpecifier.text==='./translate.mjs')changes.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:'translateSourceWithProjectBodies as translateSource'});";
export function prepareProjectBodyReuse({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));
 if(packed.length!==16292||hash(packed)!==PIN)fail('complete originals archive differs');
 const originals=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));
 if(originals.schema!=='project-body-reuse-originals-v1'||originals.files.length!==2)fail('complete original census differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');const files=[];
 for(const original of originals.files){
  const {path,source:before}=original;if(Buffer.byteLength(before)!==original.bytes||hash(before)!==original.sha256)fail('complete original source differs');
  const file=parse(ts,path,before),selections=[];let language=before,after;
  if(path.endsWith('/translate.mjs')){
   const owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='translateConcreteSyntaxStage'),'private concrete source compiler');
   const rows=[];function visit(node){rows.push(node);ts.forEachChild(node,visit);}visit(owner);
   const loop=one(rows.filter(node=>ts.isForOfStatement(node)&&ts.isBlock(node.statement)&&node.expression.getText(file)==='candidates.values()'),'standalone candidate body loop');
   const context=one(rows.filter(node=>ts.isVariableDeclaration(node)&&node.name.getText(file)==='contexts'&&ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(file)==='projectDeclarations.filter'),'original complete final project selector');
   const selector='const '+context.getText(file)+';';
   const inserted='\n    // Only skip a result the unchanged final project join replaces.\n    if(reuseProjectChecks&&sourceScope){'+selector+'if(contexts.length===1&&contexts[0].project===sourceScope.project)continue;}\n';
   selections.push({span:[owner.parameters.end,owner.parameters.end],expected:'',replacement:', reuseProjectChecks=false'}, {span:[loop.statement.getStart(file)+1,loop.statement.getStart(file)+1],expected:'',replacement:inserted});
   language=apply(before,selections);
   const entry=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='translateSource'),'unchanged original public entry');
   const start=entry.getStart(file),entrySource=entry.getText(file),calls=[];function scan(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='translateConcreteSyntaxStage')calls.push(node);ts.forEachChild(node,scan);}scan(entry);const call=one(calls,'original source-stage call');
   const copiedSelections=[{span:[entry.name.getStart(file)-start,entry.name.end-start],expected:'translateSource',replacement:'translateSourceWithProjectBodies'},{span:[call.arguments.end-start,call.arguments.end-start],expected:'',replacement:', true'}];
   const copied=apply(entrySource,copiedSelections);selections.push({nativeCopy:{span:[start,entry.end],source:entrySource,selections:copiedSelections}});
   after=language+'\n// Explicit project-body reuse; ordinary public source entries retain their original checks.\n'+copied+'\n';
  }else{
   const owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareFlatNativeOutputTextRetention'),'complete flat source producer'),calls=[];
   function scan(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='ts.forEachChild'&&node.arguments.length===2&&node.arguments[0].getText(file)==='node'&&node.arguments[1].getText(file)==='visit')calls.push(node);ts.forEachChild(node,scan);}scan(owner);
   const call=one(calls,'actual native source visitor recursion');selections.push({span:[call.getStart(file),call.getStart(file)],expected:'',replacement:importClause});
   const consumer=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='releaseOwnedProjectContexts'),'complete consumer lifetime checker'),counts=[];
   function count(node){if(ts.isBinaryExpression(node)&&node.left.getText(file)==='uses.length'&&node.operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken&&node.right.getText(file)==='8')counts.push(node.right);ts.forEachChild(node,count);}count(consumer);
   const oldCount=one(counts,'eight original allowed context references');selections.push({span:[oldCount.getStart(file),oldCount.end],expected:'8',replacement:'13',reason:'four references in the native-copied public entry and one additional filter in the private compiler; all original no-escape reference shapes remain checked'});
   language=apply(before,selections);after=language;
  }
  parse(ts,path,after);const previousAfter=path.endsWith('/translate.mjs')?after.replace('if(contexts.length===1&&contexts[0].project===sourceScope.project)continue;','if(contexts.length!==1||contexts[0].project===sourceScope.project)continue;'):after.replace('if(uses.length!==13)','if(uses.length!==8)');const current=readFileSync(resolve(root,path),'utf8');if(current!==before&&current!==after&&current!==previousAfter)fail('unknown complete physical source '+path);
  const run=createRulePipeline([{phase:'language',rules:[{id:'project-checks:eliminate-overwritten-standalone-body-results',apply:source=>{if(source!==before)fail('original phase differs');return language;}}]},{phase:'repository',rules:[{id:'router:select-explicit-project-body-reuse-entry',apply:source=>{if(source!==language)fail('language phase differs');return after;}}]}]).run(before);
  const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language',completeInverse:stage.inverse===(index?language:before)}));
  if(run.value!==after||stages.some(stage=>!stage.completeInverse))fail('complete source/CST inverse differs');const currentToAfter=current!==before&&current!==after?transportConcreteSourceEquations([{before:current,after,language:'JavaScript'}])[0]:null;if(currentToAfter&&currentToAfter.inverse!==current)fail('complete receiving-source inverse differs');files.push({path,before,language,after,current,previousAfter,currentToAfter,inverse:before,selections,stages,trace:run.trace});
 }
 const checks=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));files.forEach((row,index)=>{row.nativeBindings=checks[index];if(readFileSync(resolve(root,row.path),'utf8')!==row.current)fail('complete physical source changed');});
 if(!readFileSync(resolve(root,ARCHIVE)).equals(packed))fail('complete original archive changed');
 return {schema:'project-body-reuse-source-v1',files,originalInputs:originals.files,ordinarySourceEntriesChanged:false,newAcrossInvocationCache:false,sourceAuthority:false,runtimeAuthority:false,performanceQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');const plan=prepareProjectBodyReuse();
 if(mode==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);
 else if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete generated sources stale');
 console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
