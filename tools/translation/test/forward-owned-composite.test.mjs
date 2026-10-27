// Independent mixed full-source owned composition SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeForwardOwnedCompositeSynchronization} from '../forward-owned-composite-synchronization.mjs';
import {prepareOwnedCompositeSources} from '../prepare-owned-composite-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
const limits={timeout:60000};
function fixture(body){const files={'src/lib.rs':'pub mod translation_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};return {files,options:{entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]}};}
function parse(result,key){const ts=ownershipCompiler(),source=result[key],file=ts.createSourceFile(key==='javascript'?'caller.mjs':'caller.mts',source,ts.ScriptTarget.Latest,true,key==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS),names=new Map(result.executableDeclarations.map(row=>[row.qualifiedName,row.targetBinding().javascriptName]));const fn=name=>{const node=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===names.get(name));assert.ok(node?.body,name);return node;};return {ts,source,file,fn};}
function copy(result,key,pairs){const p=parse(result,key),edits=pairs.map(([from,to])=>({start:p.fn(to).body.getStart(p.file),end:p.fn(to).body.end,text:p.fn(from).body.getText(p.file)})).sort((a,b)=>b.start-a.start);let source=p.source;for(const edit of edits)source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);return source;}
const body=`pub fn selected(value:&str)->bool{value.contains("needle")}
pub fn gate(first:bool,second:bool)->bool{first&&second}
pub fn count(value:u8)->u8{value}
pub fn donor_count(value:u8)->u8{value.saturating_add(1)}
pub fn label()->&'static str{"before-label"}
pub fn original_format(x:&str,y:u64)->String{crate::translation_core::format!("{}:{}",x,y)}
pub fn edited_format(x:&str,y:u64)->String{crate::translation_core::format!("before-format")}
`;
function requested(original,key){
 const source=copy(original,key,[['donor_count','count'],['original_format','edited_format']]),p=parse({...original,[key]:source},key),edits=[];
 for(const name of ['selected','label']){const visit=node=>{if(p.ts.isStringLiteral(node)&&['needle','before-label'].includes(node.text))edits.push({start:node.getStart(p.file),end:node.end,text:JSON.stringify(node.text==='needle'?'fresh-needle':'after-label')});if(name==='selected'&&p.ts.isCallExpression(node)&&p.ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='includes')edits.push({start:node.expression.name.getStart(p.file),end:node.expression.name.end,text:'startsWith'});p.ts.forEachChild(node,visit);};visit(p.fn(name).body);}
 const gate=p.fn('gate'),tail=gate.body.statements.at(-1),[a,b]=gate.parameters.map(node=>node.name.text);edits.push({start:tail.expression.getStart(p.file),end:tail.expression.end,text:'('+a+' && !'+b+') || (!'+a+' && '+b+')'});let next=source;for(const edit of edits.sort((a,b)=>b.start-a.start))next=next.slice(0,edit.start)+edit.text+next.slice(edit.end);return next;
}
for(const key of ['javascript','typescript'])test(key+' mixed owned formatting literal predicate and numeric/control edits retain every adjacent source inverse',limits,async()=>{
 const input=fixture(body),original=translateProject(input.options),source=requested(original,key),proposal=proposeForwardOwnedCompositeSynchronization({...input.options,[key]:source});assert.equal(proposal.schema,'forward-qualified-owned-composite-sync-proposal-v1');assert.deepEqual(proposal.layers.map(row=>row.schema),['forward-qualified-literal-sync-proposal-v1','forward-qualified-text-predicate-method-sync-proposal-v1','forward-qualified-owned-format-body-sync-proposal-v1']);assert.equal(proposal.rustEdits.length,1);assert.equal(proposal.rustEdits[0].history.inverse,input.files['src/lib.rs']);assert.equal(proposal.requestedSource.source,source);assert.equal(proposal.crossInvocationCache,false);assert.equal(proposal.sourceAuthority,false);assert.ok(proposal.retainedRawSourceBytes<=201326592);
 let prior=input.files['src/lib.rs'];for(const layer of proposal.layers){assert.equal(layer.rustEdits[0].before,prior);assert.equal(layer.rustEdits[0].history.inverse,prior);prior=layer.rustEdits[0].after;}assert.equal(prior,proposal.rustEdits[0].after);
 await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{assert.equal(api.selected('fresh-needle tail'),true);assert.equal(api.selected('head fresh-needle'),false);assert.equal(api.label(),'after-label');assert.equal(api.count(254n),255n);assert.equal(api.count(255n),255n);assert.equal(api.edited_format('é😀',18446744073709551615n),'é😀:18446744073709551615');for(const a of [false,true])for(const b of [false,true])assert.equal(api.gate(a,b),a!==b);},{childTimeoutMs:20000});
});
test('mixed composition cannot hide new exports changed guards type annotations unknown calls or changing original source',limits,()=>{
 const input=fixture(body),original=translateProject(input.options),source=requested(original,'javascript');for(const changed of [source+'\nexport const injected=true;\n',source.replace('startsWith','unknownPredicate'),source.replace('"bigint"','"number"').replace("'bigint'","'number'")]){assert.notEqual(changed,source);assert.throws(()=>proposeForwardOwnedCompositeSynchronization({...input.options,javascript:changed}));}let reads=0;assert.throws(()=>proposeForwardOwnedCompositeSynchronization({...input.options,readSource:path=>++reads>input.options.paths.length*2?input.files[path]+'\n// changed source\n':input.files[path],javascript:source}));assert.throws(()=>proposeForwardOwnedCompositeSynchronization({...input.options,javascript:source,layers:[]}));
});
test('four complete equations retain original composite API native source owners ordered phases and complete inverses',limits,()=>{
 const plan=prepareOwnedCompositeSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
