// Independent positive scalar-literal regression SOURCE. All new cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {captureOriginalNamespaceFunction,originalNamespaceFunctionFacts} from '../original-namespace-parser.mjs';
import {preparePositiveCharacterSources} from '../prepare-positive-character-sources.mjs';
const limits={timeout:60000};
function original(source){const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:null},item=originalSourceModuleItems(module).find(row=>!row.comment),options={module,item,memberIndex:null},token=captureOriginalNamespaceFunction(options);return {source,token,options,facts:originalNamespaceFunctionFacts(token,options)};}
const samples=[["'a'",97],["'猫'",0x732b],["'🦀'",0x1f980],[String.raw`'\n'`,10],[String.raw`'\r'`,13],[String.raw`'\t'`,9],[String.raw`'\0'`,0],[String.raw`'\\'`,92],[String.raw`'\''`,39],[String.raw`'\"'`,34],[String.raw`'\x00'`,0],[String.raw`'\x7f'`,127],[String.raw`'\u{D7FF}'`,0xd7ff],[String.raw`'\u{E000}'`,0xe000],[String.raw`'\u{10_FF_FF}'`,0x10ffff]];
test('literal expressions and patterns retain one validated scalar and exact original UTF16 spans',limits,()=>{
 for(const [text,scalar]of samples){const expression=original('fn selected()->char{'+text+'}'),node=expression.facts.ast.fields.body.fields.statements[0].fields.value;assert.equal(node.kind,'Literal');assert.equal(node.fields.literalKind,'character');assert.equal(node.fields.scalarValue,scalar,text);assert.equal(node.fields.original,text);assert.equal(expression.source.slice(node.span.start,node.span.end),text);assert.equal(expression.facts.namespaceAuthority,false);assert.equal(expression.facts.runtimeAuthority,false);
  const pattern=original('fn selected(value:char){match value{'+text+'=>1,_=>0}}').facts.ast.fields.body.fields.statements[0].fields.value.fields.arms[0].fields.pattern;assert.equal(pattern.fields.variant,'literal');assert.equal(pattern.fields.literalKind,'character');assert.equal(pattern.fields.scalarValue,scalar,text);assert.equal(pattern.fields.original,text);
 }
});
test('string literals stay distinct and lifetime spelling stays a lifetime rather than a character',limits,()=>{
 const text=original('fn selected(){"猫😀"}').facts.ast.fields.body.fields.statements[0].fields.value;assert.equal(text.fields.original,'"猫😀"');assert.equal(Object.hasOwn(text.fields,'literalKind'),false);assert.equal(Object.hasOwn(text.fields,'scalarValue'),false);
 const row=original("fn selected<'a>(value:&'a str)->&'a str{value}");assert.equal(row.facts.ast.fields.parameters[0].fields.type.fields.lifetime.kind,'Lifetime');assert.equal(row.facts.ast.fields.parameters[0].fields.type.fields.lifetime.fields.original,"'a");
 const returned=original("fn selected()->char{loop{break '🦀';}}").facts.ast.fields.body.fields.statements[0].fields.value.fields.body.fields.statements[0].fields.value;assert.equal(returned.kind,'Jump');assert.equal(returned.fields.label,null);assert.equal(returned.fields.value.fields.scalarValue,0x1f980);
});
test('opaque macro token text and coordinates remain original without granting expansion or type authority',limits,()=>{
 const source=String.raw`fn selected(){capture!('猫','\n','a);}`,row=original(source),tree=row.facts.opaqueInvocations[0].fields.tree;assert.equal(tree.original,String.raw`('猫','\n','a)`);for(const token of tree.tokens)assert.equal(source.slice(token.start,token.end),token.text);assert.equal(row.facts.opaqueInvocations[0].fields.ownerResolved,false);assert.equal(row.facts.opaqueInvocations[0].fields.runtimeEffect,'unresolved');
});
test('invalid scalar escapes raw controls surrogate values bytes and malformed literals stay refused',limits,()=>{
 const invalid=[String.raw`'\q'`,String.raw`'\x80'`,String.raw`'\u{D800}'`,String.raw`'\u{DFFF}'`,String.raw`'\u{110000}'`,String.raw`'\u{_41}'`,String.raw`'\u{1234567}'`,"'ab'","''","'\n'","'\t'","'"+String.fromCharCode(0xd800)+"'",String.raw`b'a'`];for(const text of invalid){assert.throws(()=>original('fn selected(){'+text+'}'),undefined,text);assert.throws(()=>original('fn selected(value:char){match value{'+text+'=>1,_=>0}}'),undefined,text);}
 const row=original("fn selected(){'a'}");assert.throws(()=>originalNamespaceFunctionFacts({...row.token},row.options),/copied or foreign/u);
});
test('two complete grammar equations retain original modules native owners phases and whole inverses',limits,()=>{
 const plan=preparePositiveCharacterSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
