// Independent complete native else-if source inverse cases. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {forwardConditionalSourceStatements,forwardConditionalComparisonSource} from '../forward-conditional-source.mjs';
import {floatingBodySignature} from '../body-inverse-source-support.mjs';
import {proposeForwardControlBodySynchronization as control} from '../forward-control-body-synchronization.mjs';
import {proposeForwardImperativeBodySynchronization as imperative} from '../forward-imperative-body-synchronization.mjs';
import {proposeForwardRangeBodySynchronization as range} from '../forward-range-body-synchronization.mjs';
import {proposeForwardFloatingBodySynchronization as floating} from '../forward-floating-body-synchronization.mjs';
import {proposeForwardStandardFloatingBodySynchronization as standardFloating} from '../forward-standard-floating-body-synchronization.mjs';
import {proposeForwardStandardNumericBodySynchronization as standardNumeric} from '../forward-standard-numeric-body-synchronization.mjs';
import {proposeForwardOwnedFormatBodySynchronization as owned} from '../forward-owned-format-body-synchronization.mjs';
import {proposeForwardOwnedCompositeSynchronization as mixed} from '../forward-owned-composite-synchronization.mjs';
import {prepareForwardElseIfSources} from '../prepare-forward-else-if-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},source='pub fn selected(a:bool,b:bool)->bool{a}\n',options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
function native(text){const ts=ownershipCompiler(),file=ts.createSourceFile('else-if.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);return {ts,file,body:file.statements[0].body};}
function changed(result,key,body){const ts=ownershipCompiler(),text=result[key],file=ts.createSourceFile(key==='javascript'?'else-if.mjs':'else-if.mts',text,ts.ScriptTarget.Latest,true,key==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS),name=result.executableDeclarations.find(row=>row.qualifiedName==='selected').targetBinding().javascriptName,node=file.statements.find(row=>ts.isFunctionDeclaration(row)&&row.name?.text===name);assert.ok(node?.body);const parameters=node.parameters.map(row=>row.name.text),prefix=[...node.body.statements].slice(0,-1).map(row=>row.getText(file)).join('\n'),replacement='{\n'+prefix+'\n'+body(...parameters)+'\n}';return text.slice(0,node.body.getStart(file))+replacement+text.slice(node.body.end);}
const chain=(a,b)=>'if ('+a+') { return !'+b+'; } else if ('+b+') { return true; } else { return false; }';
test('only an actual else singleton-if wrapper is normalized while branch declarations and statement scopes remain distinct',limits,()=>{
 const direct=native('function f(a,b){if(a){return !b;}else if(b){return true;}else{return false;}}'),wrapped=native('function f(a,b){if(a){return !b;}else{if(b){return true;}else{return false;}}}'),different=native('function f(a,b){if(a){return !b;}else{const c=b;if(c){return true;}else{return false;}}}'),node=wrapped.body.statements[0],otherwise=node.elseStatement;assert.equal(forwardConditionalComparisonSource(direct.ts,otherwise),otherwise.statements[0]);assert.deepEqual(forwardConditionalSourceStatements(direct.ts,otherwise),[...otherwise.statements]);assert.deepEqual(forwardConditionalSourceStatements(direct.ts,direct.body.statements[0].elseStatement),[direct.body.statements[0].elseStatement]);const signature=row=>floatingBodySignature(row.body,row.ts,row.file.text,row.file);assert.deepEqual(signature(direct),signature(wrapped));assert.notDeepEqual(signature(direct),signature(different));const declarationBlock=different.body.statements[0].elseStatement;assert.equal(forwardConditionalComparisonSource(direct.ts,declarationBlock),declarationBlock);assert.throws(()=>forwardConditionalSourceStatements({...direct.ts},otherwise));assert.throws(()=>forwardConditionalSourceStatements(direct.ts,node.expression));assert.throws(()=>forwardConditionalSourceStatements(direct.ts,null));
});
for(const key of ['javascript','typescript'])for(const [label,propose]of [['control',control],['imperative',imperative],['range',range],['floating',floating],['standard floating',standardFloating],['standard numeric',standardNumeric],['owned format',owned],['mixed owned',mixed]])test(label+' '+key+' complete else-if edit retains actual guards original source inverse and independent truth table',limits,async()=>{
 const original=translateProject(options),requested=changed(original,key,chain),proposal=propose({...options,[key]:requested});assert.equal(proposal.rustEdits[0].history.inverse,source);assert.equal(proposal.requestedSource.source,requested);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.crossInvocationCache,false);await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{for(const a of [false,true])for(const b of [false,true])assert.equal(api.selected(a,b),a!==b);},{childTimeoutMs:20000});
});
for(const key of ['javascript','typescript'])test(key+' unbraced branches changed outside-function source and unsupported branch calls remain refused',limits,()=>{
 const original=translateProject(options),request=body=>({...options,[key]:changed(original,key,body)});assert.throws(()=>owned(request((a,b)=>'if ('+a+') return !'+b+'; else if ('+b+') {return true;} else {return false;}')));assert.throws(()=>owned(request((a,b)=>'if ('+a+') { return unknown('+b+'); } else if ('+b+') {return true;} else {return false;}')));assert.throws(()=>owned({...options,[key]:changed(original,key,chain)+'\nconst outside=1;\n'}));
});
test('eleven complete compiler equations retain original native whole-file owners ordered phases and exact source inverses',limits,()=>{
 const plan=prepareForwardElseIfSources();assert.equal(plan.files.length,11);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
