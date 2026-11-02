// Extend existing source-history preparations through their genuine successors.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {defaultByteHistoryOriginals} from './default-byte-source-successors.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const need=(value,message)=>{if(!value)throw new TypeError('Default byte history source extension: '+message);};
function one(rows,name){need(rows.length===1,'one native selection '+name);return rows[0];}
function parsed(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length&&source.split('\n').length<1000,'whole native grammar and line bounds');return file;}
function walk(ts,node,predicate){const rows=[];function visit(node){if(predicate(node))rows.push(node);ts.forEachChild(node,visit);}visit(node);return rows;}
function selection(file,node,replacement,reason){return {span:[node.getStart(file),node.end],expected:node.getText(file),replacement,reason};}
function apply(source,rows){let after=source,end=source.length+1;for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){const [a,b]=row.span;need(b<end&&source.slice(a,b)===row.expected,'disjoint exact native source selections');after=after.slice(0,a)+row.replacement+after.slice(b);end=a;}return after;}
export function prepareDefaultByteHistoryExtension({root=ROOT}={}){
 root=resolve(root);const originals=defaultByteHistoryOriginals(root),ts=ownershipCompiler();need(ts.version==='5.9.3','installed TypeScript5.9.3');const files=[];
 for(const original of originals.files.filter(row=>!row.path.includes('/test/fixtures/'))){
  const {path,source:before}=original,file=parsed(ts,path,before),edits=[];let imported,previousAfter;
  if(path.endsWith('/prepare-default-proof-byte-adoption.mjs')){
   for(const name of ['prepareDefaultProofByteAdoption','prepareDefaultProofByteEnclosingHistory']){
    const owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name),declaration=one(walk(ts,owner,node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='prerequisiteInputs'),'complete prerequisite vector');
    need(declaration.initializer.getText(file).startsWith('PREREQUISITES.map('),'original prerequisite mapping');edits.push(selection(file,declaration.initializer,'qualifyDefaultBytePrerequisites(root,originals,PREREQUISITES)','qualify-only-exact-current-guarded-import-successor'));
   }
   const owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareDefaultProofByteAdoption'),'complete default producer'),loop=one(owner.body.statements.filter(node=>ts.isForOfStatement(node)&&node.expression.getText(file)==='files'&&ts.isBlock(node.statement)),'original complete current target checks');
   const body=loop.statement.getText(file).slice(1,-1),replacement=['{const successors=qualifyDefaultByteSourceSuccessors({root,files});','for(const row of files){',' const successor=successors.get(row.path);',' if(successor){const historicalAfter=row.after;Object.assign(row,equation(ts,root,row.path,row.before,row.language,successor.source,row.nativeSelections),{historicalAfter,knownSourceHistory:successor.history});}',body,'}}'].join('\n');
   edits.push(selection(file,loop,replacement,'compose-complete-known-tuples-and-source-operation-histories-before-original-checks'));
   imported="import {qualifyDefaultBytePrerequisites,qualifyDefaultByteSourceSuccessors} from './default-byte-source-successors.mjs';\n";
   previousAfter=imported+apply(before,edits);
   const equation=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='equation'),'complete original equation');
   const declared=name=>one(walk(ts,equation,node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name),name),first=declared('first'),stageArray=declared('stages');
   edits.push({span:[first.getStart(file),first.getStart(file)],expected:'',replacement:'currentEquation=tryDefaultByteSourceEquation(before,language,after,sequence),',reason:'one existing authenticated source operation per complete small equation'});
   edits.push(selection(file,first.initializer,'currentEquation?{meta:currentEquation.beforeMeta,document:null}:'+first.initializer.getText(file),'retain complete original source fallback'));
   edits.push(selection(file,stageArray.initializer,'currentEquation?currentEquation.stages:[]','retain both complete checked phase results'));
   const phaseLoop=one(equation.body.statements.filter(ts.isForOfStatement),'original complete phase loop');edits.push(selection(file,phaseLoop,'if(!currentEquation)'+phaseLoop.getText(file),'preserve entire original fallback and every source inverse'));
   const returned=one(equation.body.statements.filter(ts.isReturnStatement),'original complete equation return'),field=one(returned.expression.properties.filter(node=>ts.isPropertyAssignment(node)&&node.name.getText(file)==='afterMeta'),'original final metadata field');
   edits.push(selection(file,field.initializer,'currentEquation?currentEquation.afterMeta:'+field.initializer.getText(file),'same complete canonical output field'));
   imported="import {qualifyDefaultBytePrerequisites,qualifyDefaultByteSourceSuccessors,tryDefaultByteSourceEquation} from './default-byte-source-successors.mjs';\n";
  }else{
   need(path.endsWith('/prepare-current-receiving-source-history.mjs'),'closed source target census');
   const found=one(walk(ts,file,node=>ts.isIfStatement(node)&&node.thenStatement.getText(file).includes("fail('complete receiving target differs from birth/exact generated equation: '+path)")),'original receiving-target refusal');
   edits.push(selection(file,found.expression,'('+found.expression.getText(file)+")&&!isKnownDefaultByteReceivingPredecessor(root,path,current)",'retain-only-the-exact-complete-prior-receiving-helper'));
   imported="import {isKnownDefaultByteReceivingPredecessor} from './default-byte-source-successors.mjs';\n";
  }
  const language=apply(before,edits),after=imported+language;parsed(ts,path,after);
  const run=createRulePipeline([{phase:'language',rules:[{id:'javascript:compose-authenticated-complete-source-successor-equations',apply:source=>{need(source===before,'original source join');return language;}}]},{phase:'repository',rules:[{id:'router:bind-current-source-history-helpers',apply:source=>{need(source===language,'language source join');return after;}}]}]).run(before);need(run.value===after,'ordered source substitution result');
  const current=readFileSync(resolve(root,path),'utf8');need(current===before||current===after||current===previousAfter,'unknown complete physical source '+path);
  const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(stages[0].inverse===before&&stages[1].inverse===language,'whole serialized/reparsed CST inverses');
  const currentToAfter=current!==before&&current!==after?transportConcreteSourceEquations([{before:current,after,language:'JavaScript'}])[0]:null;if(currentToAfter)need(currentToAfter.inverse===current,'complete previous draft inverse');
  files.push({path,before,language,after,current,previousAfter:previousAfter??null,currentToAfter,nativeSelections:edits,stages,trace:run.trace,inverse:before});
 }
 const bindings=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));files.forEach((row,index)=>{row.nativeBindings=bindings[index];need(readFileSync(resolve(root,row.path),'utf8')===row.current,'physical source changed');});
 return {schema:'default-byte-known-source-history-extension-v1',files,originalInputs:originals.files,sourceAuthority:false,runtimeAuthority:false,runtimeSourceChanged:false,originalCaseBodiesChanged:false,originalDeadlinesChanged:false,newAcrossInvocationCache:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareDefaultByteHistoryExtension();
 if(args[0]==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);
 if(args[0]==='--check')need(plan.files.every(row=>row.current===row.after),'source history preparations are stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
