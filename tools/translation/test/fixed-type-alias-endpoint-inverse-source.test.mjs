// Independent actual user alias endpoint inverse SOURCE. UNRUN.
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

import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
const C='Count';
const body='pub mod translation_fixed_types_core;\npub type Count=crate::translation_fixed_types_core::U64;\npub mod translation_integer_core;\npub fn donor(value:'+C+')->'+C+'{value}\npub fn edited(value:'+C+')->'+C+'{crate::translation_integer_core::u64_wrapping_add(value,1_u64)}\npub fn keep(value:'+C+')->'+C+'{crate::translation_integer_core::u64_wrapping_add(value,1_u64)}\n';
for(const key of ['javascript','typescript'])for(const [label,propose]of [['whole owned',proposeForwardOwnedFormatBodySynchronization],['mixed owned',proposeForwardOwnedCompositeSynchronization]])test(label+' '+key+' complete source inversion retains the actual user alias signature and complete original source',limits,async()=>{
 const input=fixture(body);input.files['src/translation_fixed_types_core.rs']=FIXED_TYPE_CORE_NATIVE_SOURCE;input.files['src/translation_integer_core.rs']=INTEGER_NATIVE_SOURCE;input.options.paths=Object.keys(input.files);const original=translateProject(input.options),source=copy(original,key,[['donor','edited']]),proposal=propose({...input.options,[key]:source});assert.equal(proposal.rustEdits[0].history.inverse,input.files['src/lib.rs']);assert.ok(proposal.rustEdits[0].after.includes('pub fn edited(value:'+C+')->'+C));assert.equal(proposal.requestedSource.source,source);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.runtimeParity,false);await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{for(const value of [0n,1n,18446744073709551615n])assert.equal(api.edited(value),value);},{childTimeoutMs:20000});
});
