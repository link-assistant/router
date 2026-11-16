// Source proposal DATA only. Callers must independently join complete current
// runtime mirrors and reissue checked application source before installation.
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Source unit runtime relocation: '+message);};
export function relocateSourceUnitRuntimeTarget(source,from,to,runtimeBefore,runtimeAfter,language,runtimeRoots=[runtimeBefore]){
 if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>8388608||!['JavaScript','TypeScript'].includes(language)||!Array.isArray(runtimeRoots)||runtimeRoots.length<1||runtimeRoots.length>2||new Set(runtimeRoots).size!==runtimeRoots.length)fail('bounded complete source and runtime roots required');
 for(const path of [from,to,runtimeBefore,runtimeAfter,...runtimeRoots])if(typeof path!=='string'||!path||path.length>4096||path.startsWith('/')||path.includes('\\')||/[\x00-\x1f\x7f:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('safe relative source and runtime paths required');
 const ts=ownershipCompiler(),file=ts.createSourceFile(from,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native target syntax differs');let cells=0;const literals=[],seen=new Set();
 function literal(node){if(!ts.isStringLiteral(node))fail('literal target module edge required');const start=node.getStart(file),key=start+':'+node.end;if(seen.has(key))return;seen.add(key);if(start<0||node.end<start||node.end>source.length||node.getText(file)!==source.slice(start,node.end))fail('actual native module literal span differs');literals.push({node,start,end:node.end});}
 function visit(node,depth=0){
  if(++cells>200000||depth>256)fail('complete native target traversal budget exceeded');
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier)literal(node.moduleSpecifier);
  if(ts.isImportTypeNode(node)){if(!ts.isLiteralTypeNode(node.argument))fail('literal static type module required');literal(node.argument.literal);}
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){if(node.arguments.length!==1)fail('one literal dynamic module required');literal(node.arguments[0]);}
  ts.forEachChild(node,child=>visit(child,depth+1));for(const doc of node.jsDoc??[])visit(doc,depth+1);
 }
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'source-unit:collect-complete-native-runtime-module-edges',apply:()=>{visit(file);return literals;}}]},
  {phase:'repository',rules:[{id:'router:map-declared-current-runtime-mirrors-and-retain-full-inverse',apply:rows=>{
   const edits=[];for(const row of rows){const {node,start,end}=row;if(node.text.startsWith('node:'))continue;if(!node.text.startsWith('.'))fail('unbound package import in source-unit target');const before=posix.normalize(posix.join(posix.dirname(from),node.text)),matches=runtimeRoots.filter(root=>before.startsWith(root+'/'));if(matches.length!==1)fail('target import escapes or ambiguously matches declared runtime closure');const root=matches[0],full=runtimeAfter+before.slice(root.length),relative=posix.relative(posix.dirname(to),full),replacement=JSON.stringify(relative.startsWith('.')?relative:'./'+relative);edits.push({span:[start,end],expected:source.slice(start,end),replacement});}
   edits.sort((left,right)=>left.span[0]-right.span[0]||left.span[1]-right.span[1]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('native module edits overlap');let after=source;for(const row of [...edits].reverse())after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);const equation=transportConcreteSourceEquations([{before:source,after,language}])[0];if(equation.inverse!==source)fail('whole native target module inverse differs');return {source:after,edits,equation};
  }}]},
 ]).run(null);return run.value;
}
