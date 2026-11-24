// Independent complete mutable append assignment inverse SOURCE. UNRUN.
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
pub fn donor(value:&str)->String{let mut output=String::new();output=crate::translation_text_core::append_owned(output,value);output}
pub fn edited(value:&str)->String{let mut output=String::new();output=crate::translation_text_core::append_owned(output,"old");output}
`;
for(const key of ['javascript','typescript'])for(const [label,propose]of [['whole owned',proposeForwardOwnedFormatBodySynchronization],['mixed owned',proposeForwardOwnedCompositeSynchronization]])test(label+' '+key+' original mutable consuming append assignment retains source bindings and complete paired reproduction',limits,async()=>{
 const input=fixture(body),original=translateProject(input.options),source=copy(original,key,[['donor','edited']]),proposal=propose({...input.options,[key]:source});assert.equal(proposal.rustEdits[0].history.inverse,input.files['src/lib.rs']);assert.equal(proposal.requestedSource.source,source);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.runtimeParity,false);await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{for(const value of ['','é😀','a\0b'])assert.equal(api.edited(value),value);},{childTimeoutMs:20000});
});
