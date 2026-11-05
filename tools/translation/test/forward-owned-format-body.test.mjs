// Independent whole generated-module owned formatting SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeForwardOwnedFormatBodySynchronization} from '../forward-owned-format-body-synchronization.mjs';
import {proposeForwardStandardNumericBodySynchronization} from '../forward-standard-numeric-body-synchronization.mjs';
import {prepareForwardOwnedFormatSources} from '../prepare-forward-owned-format-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
const limits={timeout:60000},widths=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
function fixture(body){const files={'src/lib.rs':'pub mod translation_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};return {files,options:{entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]}};}
function parse(result,key){const ts=ownershipCompiler(),source=result[key],file=ts.createSourceFile(key==='javascript'?'caller.mjs':'caller.mts',source,ts.ScriptTarget.Latest,true,key==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS),names=new Map(result.executableDeclarations.map(row=>[row.qualifiedName,row.targetBinding().javascriptName]));const fn=name=>{const node=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===names.get(name));assert.ok(node?.body,name);return node;};return {ts,source,file,fn};}
function copy(result,key,pairs){const p=parse(result,key),edits=pairs.map(([from,to])=>({start:p.fn(to).body.getStart(p.file),end:p.fn(to).body.end,text:p.fn(from).body.getText(p.file)})).sort((a,b)=>b.start-a.start);let source=p.source;for(const edit of edits)source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);return source;}
for(const key of ['javascript','typescript'])test(key+' batches ten fixed widths bool borrowed text and concatenation into original whole-module source edits',limits,async()=>{
 const bodies=widths.map(type=>'pub fn donor_'+type+'(x:'+type+')->String{crate::translation_core::format!("{}",x)}\npub fn edited_'+type+'(x:'+type+')->String{crate::translation_core::format!("before")}\n').join('')+`pub fn donor_bool(x:bool)->String{crate::translation_core::format!("{}",x)}
pub fn edited_bool(x:bool)->String{crate::translation_core::format!("before")}
pub fn donor_text(x:&str)->String{crate::translation_core::format!("{}",x)}
pub fn edited_text(x:&str)->String{crate::translation_core::format!("before")}
pub fn donor_join(x:&str,y:u64)->String{crate::translation_core::format!("{}:{}",x,y)}
pub fn edited_join(x:&str,y:u64)->String{crate::translation_core::format!("before")}
`,input=fixture(bodies),original=translateProject(input.options),names=[...widths,'bool','text','join'],requested=copy(original,key,names.map(name=>['donor_'+name,'edited_'+name])),proposal=proposeForwardOwnedFormatBodySynchronization({...input.options,[key]:requested});
 assert.equal(proposal.expressionEditCount,13);assert.equal(proposal.schema,'forward-qualified-owned-format-body-sync-proposal-v1');assert.equal(proposal.rustEdits[0].history.inverse,input.files['src/lib.rs']);assert.equal(proposal.requestedSource.source,requested);assert.equal(proposal.crossInvocationCache,false);assert.equal(proposal.sourceAuthority,false);for(const history of [proposal.javascriptHistory,proposal.typescriptHistory])assert.equal(typeof history.inverse,'string');
 await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{for(const type of widths){const bits=BigInt(type.slice(1)),signed=type[0]==='i',maximum=(1n<<(bits-(signed?1n:0n)))-1n,minimum=signed?-(1n<<(bits-1n)):0n;assert.equal(api['edited_'+type](maximum),maximum.toString());assert.equal(api['edited_'+type](minimum),minimum.toString());}assert.equal(api.edited_bool(false),'false');assert.equal(api.edited_bool(true),'true');assert.equal(api.edited_text('é😀'),'é😀');assert.equal(api.edited_join('é😀',18446744073709551615n),'é😀:18446744073709551615');},{childTimeoutMs:20000});
 assert.throws(()=>proposeForwardStandardNumericBodySynchronization({...input.options,[key]:requested}));
});
test('computed formatting arguments keep original temporary bindings and left-to-right evaluation',limits,async()=>{
 const input=fixture('pub fn next(value:u64)->u64{value+1}\npub fn computed(value:u64)->String{crate::translation_core::format!("{}:{}",next(value),next(value+1))}\n'),original=translateProject(input.options),p=parse(original,'javascript'),body=p.fn('computed').body.getText(p.file);assert.ok(body.includes('ml_fmt_'));await verifyTypedTargets(original,api=>assert.equal(api.computed(0n),'1:2'),{childTimeoutMs:20000});
});
test('the whole target guard helper export and ownership/source checks remain mandatory',limits,()=>{
 const input=fixture('pub fn donor(x:u64)->String{crate::translation_core::format!("{}",x)}\npub fn edited(x:u64)->String{crate::translation_core::format!("before")}\n'),original=translateProject(input.options),requested=copy(original,'javascript',[['donor','edited']]),p=parse({...original,javascript:requested},'javascript'),body=p.fn('edited').body,statements=[...body.statements],guard=statements[0],changed=requested.slice(0,guard.getStart(p.file))+requested.slice(guard.end);
 assert.throws(()=>proposeForwardOwnedFormatBodySynchronization({...input.options,javascript:changed}));assert.throws(()=>proposeForwardOwnedFormatBodySynchronization({...input.options,javascript:requested.replace('export const provenance =','export const fake =')}));
 const tail=statements.at(-1);for(const expression of ['String(x,x)','String(...[x])','String?.(x)','String({valueOf(){return x;}})','globalThis.String(x)','String(Promise.resolve(x))']){const source=requested.slice(0,tail.getStart(p.file))+'return '+expression+';'+requested.slice(tail.end);assert.throws(()=>proposeForwardOwnedFormatBodySynchronization({...input.options,javascript:source}),expression);}
});
test('six complete compiler equations retain original APIs whole source owners two phases and full inverses',limits,()=>{
 const plan=prepareForwardOwnedFormatSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
