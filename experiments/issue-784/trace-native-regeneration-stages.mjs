// Finite phase timing of four complete real checks, without CPU-profile copies.
// The instrumented sibling is diagnostic source, never installed or admitted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const path='tools/translation/js-to-rust/native-typescript.mjs';
const before=readFileSync(path,'utf8'),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');
assert.equal(before.includes('import.meta'),false);
const original=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.deepEqual(original.parseDiagnostics,[]);
const edits=[];
function replacement(fragment,old,value){
 const at=fragment.indexOf(old);assert.ok(at>=0);assert.equal(fragment.lastIndexOf(old),at);
 return fragment.slice(0,at)+value+fragment.slice(at+old.length);
}
for(const node of original.statements){
 if(!ts.isFunctionDeclaration(node))continue;
 const name=node.name?.text;let source=before.slice(node.getStart(original),node.end),next=source;
 if(name==='buildNativeTypeScriptForRegeneration'){
  for(const [label,expression] of [
   ['inference','regenerationInference(ts, sourceRoot, paths)'],
   ['serialize','parseBuildReconstructedNativeJavaScript(ts, path, source, { file: inference.program.getSourceFile(join(sourceRoot, path)), checker: inference.checker })'],
   ['serialize-meta','`${JSON.stringify(meta)}\\n`'],
   ['reparse-meta','JSON.parse(metaText)'],
   ['emit','emitRegeneratedNativeTypeScript(ts, reparsed)'],
   ['erase','ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true, useDefineForClassFields: false }, fileName: target }).outputText'],
   ['runtime-identity','hashMatchingNativeRuntimeAST(ts,source,erased,{rewriteImports:true})'],
   ['inference-final-inputs','inference.assertInputsCurrent()'],
  ])next=replacement(next,expression,'traceStage('+JSON.stringify(label)+',()=>('+expression+'))');
 }
 if(name==='nativeRegenerationParsedConcreteSources'){
  const expression="prepareReverseConcreteParsedSourceChunks([rows.map(row=>({source:row.source,language:'JavaScript'}))])";
  next=replacement(next,expression,'traceStage("concrete-transport",()=>('+expression+'))');
 }
 if(source!==next)edits.push({start:node.getStart(original),end:node.end,expected:source,replacement:next});
}
assert.equal(edits.length,2);
let instrumented=before;
for(const edit of [...edits].reverse())instrumented=instrumented.slice(0,edit.start)+edit.replacement+instrumented.slice(edit.end);
// Relocate only actual relative ESM specifier literals; retain their full inverse.
const file=ts.createSourceFile(path,instrumented,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const relocations=[];
for(const statement of file.statements){
 if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
 const spec=statement.moduleSpecifier;if(!spec||!ts.isStringLiteral(spec)||!spec.text.startsWith('.'))continue;
 relocations.push({start:spec.getStart(file),end:spec.end,expected:spec.getText(file),replacement:JSON.stringify(new URL(spec.text,pathToFileURL(resolve(path))).href)});
}
let relocated=instrumented;
for(const edit of [...relocations].reverse())relocated=relocated.slice(0,edit.start)+edit.replacement+relocated.slice(edit.end);
const prelude='const traceRows=[];function traceStage(name,operation){const started=performance.now();try{return operation();}finally{if(traceRows.length>=8192)throw Error("Finite stage trace bound");traceRows.push({name,milliseconds:performance.now()-started});}}\n';
const module=await import('data:text/javascript;base64,'+Buffer.from(prelude+relocated+'\nexport {traceRows};').toString('base64'));
const checks=[];
for(let at=0;at<4;at++){
 const start=performance.now(),first=module.traceRows.length;
 const result=module.regenerateNativeTypeScript(process.cwd(),{sourceRoot:process.cwd(),check:true});
 assert.deepEqual(result.changed,[]);assert.deepEqual(result.unexpected,[]);
 const phases=module.traceRows.slice(first),totals={};
 for(const row of phases)totals[row.name]=(totals[row.name]??0)+row.milliseconds;
 const row={at,milliseconds:performance.now()-start,result,phases,totals};checks.push(row);
 console.log(JSON.stringify({at,milliseconds:row.milliseconds,totals}));
}
assert.equal(readFileSync(path,'utf8'),before);
const receipt={schema:'complete-native-regeneration-stage-trace-v1',before,instrumented,relocated,prelude,edits,relocations,checks,
 node:process.versions.node,typescript:ts.version,completeChecks:4,diagnosticOnly:true,originalCaseDeadlineQualified:false,fullGatePassed:false,runtimeParity:false,rustExecuted:false};
writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/native-stages-four-checks.json',Buffer.from(JSON.stringify(receipt)));
