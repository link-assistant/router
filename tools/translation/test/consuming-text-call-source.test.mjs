// Independent original emitted-module consuming text call inverse SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeForwardOwnedFormatBodySynchronization} from '../forward-owned-format-body-synchronization.mjs';
import {proposeForwardOwnedCompositeSynchronization} from '../forward-owned-composite-synchronization.mjs';
import {createConsumingTextCallSource} from '../consuming-text-call-source.mjs';
import {prepareConsumingTextCallSources} from '../prepare-consuming-text-call-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
const limits={timeout:60000};
function fixture(body){const files={'src/lib.rs':'pub mod translation_core;\n'+body,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};return {files,options:{entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]}};}
function parse(result,key){const ts=ownershipCompiler(),source=result[key],file=ts.createSourceFile(key==='javascript'?'caller.mjs':'caller.mts',source,ts.ScriptTarget.Latest,true,key==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS),names=new Map(result.executableDeclarations.map(row=>[row.qualifiedName,row.targetBinding().javascriptName]));const fn=name=>{const node=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===names.get(name));assert.ok(node?.body,name);return node;};return {ts,source,file,fn};}
function copy(result,key,pairs){const p=parse(result,key),edits=pairs.map(([from,to])=>({start:p.fn(to).body.getStart(p.file),end:p.fn(to).body.end,text:p.fn(from).body.getText(p.file)})).sort((a,b)=>b.start-a.start);let source=p.source;for(const edit of edits)source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);return source;}
const body=`pub mod translation_text_core;
pub fn donor(x:&str,y:&str)->String{let output=crate::translation_text_core::to_owned(x);crate::translation_text_core::append_owned(output,y)}
pub fn edited(x:&str,y:&str)->String{let output=crate::translation_text_core::to_owned(x);crate::translation_text_core::clear_owned(output)}
pub fn keep_clear(value:String)->String{crate::translation_text_core::clear_owned(value)}
`;
for(const key of ['javascript','typescript'])for(const [label,propose]of [['whole owned',proposeForwardOwnedFormatBodySynchronization],['mixed owned',proposeForwardOwnedCompositeSynchronization]])test(label+' '+key+' actual runtime calls retain original library/source bindings through fresh whole-module synchronization',limits,async()=>{
 const input=fixture(body),original=translateProject(input.options),source=copy(original,key,[['donor','edited']]),proposal=propose({...input.options,[key]:source});assert.equal(proposal.rustEdits[0].history.inverse,input.files['src/lib.rs']);assert.equal(proposal.requestedSource.source,source);assert.equal(proposal.crossInvocationCache,false);assert.equal(proposal.sourceAuthority,false);if(label==='whole owned'){assert.equal(proposal.consumingTextSourceInputs.library.length,3);assert.deepEqual(proposal.consumingTextSourceInputs.bindings.map(row=>row.operation).sort(),['append_owned','to_owned']);for(const row of proposal.consumingTextSourceInputs.library){assert.equal(typeof row.source,'string');assert.equal(row.sourceAuthority,false);}}await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{for(const x of ['','é😀','a\0b'])for(const y of ['','tail','é😀'])assert.equal(api.edited(x,y),x+y);assert.equal(api.keep_clear('é😀'),'');},{childTimeoutMs:20000});
});
test('actual import observations cannot admit wrong module aliases lexical shadows arity or nonowned actual values',limits,()=>{
 const input=fixture(body),original=translateProject(input.options),p=parse(original,'javascript'),calls=createConsumingTextCallSource({entry:input.options.entry,source:p.source,file:p.file}),aliases=p.file.statements.filter(p.ts.isImportDeclaration).flatMap(node=>node.importClause?.namedBindings?.elements??[]),append=aliases.find(row=>(row.propertyName??row.name).text==='router_text_append_owned');assert.ok(append);const name=append.name.text;assert.equal(calls.has(name),true);assert.throws(()=>calls.lower(name,['x']));assert.equal(calls.lower(name,['x','y']),'crate::translation_text_core::append_owned(x, y)');calls.verify();const source=copy(original,'javascript',[['donor','edited']]),edited=parse({...original,javascript:source},'javascript').fn('edited'),tail=edited.body.statements.at(-1),before=tail.getStart(edited.getSourceFile()),end=tail.end;
 for(const text of [name+'(x,y)',name+'(x)',name+'(...[x,y])','unknown_consuming_text(x,y)']){const changed=source.slice(0,before)+'return '+text+';'+source.slice(end);assert.throws(()=>proposeForwardOwnedFormatBodySynchronization({...input.options,javascript:changed}),text);}const shadow=p.ts.createSourceFile('shadow.mjs','function caller(x){const '+name+'=x;return x;}',p.ts.ScriptTarget.Latest,true,p.ts.ScriptKind.JS);assert.throws(()=>calls.assertFunctionScope({parameters:['x'],expression:shadow.statements[0].body}));assert.throws(()=>proposeForwardOwnedFormatBodySynchronization({...input.options,javascript:source.replace('text-runtime.mjs','unknown-runtime.mjs')}));
});
test('owned empty String construction preserves a real emitted owned-text witness',limits,async()=>{
 const input=fixture('pub fn empty()->String{String::new()}\n'),result=translateProject(input.options),p=parse(result,'javascript');assert.ok(p.fn('empty').body.getText(p.file).includes('String(""'));await verifyTypedTargets(result,api=>assert.equal(api.empty(),''),{childTimeoutMs:20000});
});
test('four full compiler equations retain original source owners ordered phases and complete inverses',limits,()=>{
 const plan=prepareConsumingTextCallSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
