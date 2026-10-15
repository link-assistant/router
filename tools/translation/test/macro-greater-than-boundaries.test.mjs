import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {originalMacroTrees,macroTreeSource,originalMacroTreeText} from '../macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput} from '../declarative-token-macros.mjs';
import {builtinPayloadDataInputs} from '../builtin-derive-data-inputs.mjs';
const flat=trees=>trees.flatMap(tree=>tree.kind==='group'?flat(tree.children):[tree]),hash=value=>createHash('sha256').update(value).digest('hex');
function retain(name,value){const directory=process.env.ROUTER_PAYLOAD_DERIVE_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'gt-'+name+'.json'),JSON.stringify(value),{flag:'wx'});}}

test('whole pinned Rust Gt/Shr glue and break source excludes a triple-Gt token',{timeout:5000},()=>{
 const source=gunzipSync(readFileSync(new URL('../source-profiles/clap-concat/rust-1.89-token.rs.gz',import.meta.url))).toString('utf8');assert.equal(Buffer.byteLength(source),40118);assert.equal(hash(source),'a15e0c1152f601a82bad4f08553ce68dc88aad6cde52c618e30a6d292c4d1751');const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000}),glue=[],breaks=[];
 function visit(nodes){for(let at=0;at<nodes.length;at++){if(nodes[at].text==='fn'&&['glue','break_two_token_op'].includes(nodes[at+1]?.text)){let end=at+2;while(end<nodes.length&&nodes[end]?.delimiter!=='{')end++;if(nodes[end]?.delimiter==='{'){const span={start:nodes[at].span.start,end:nodes[end].span.end},row={span,source:source.slice(span.start,span.end),syntax:nodes.slice(at,end+1)};(nodes[at+1].text==='glue'?glue:breaks).push(row);}}if(nodes[at].kind==='group')visit(nodes[at].children);}}visit(trees);
 assert.equal(glue.length,1);assert.equal(breaks.length,1);assert.ok(glue[0].source.includes('(Gt, Gt) => Shr'));assert.ok(glue[0].source.includes('(Shr, _) => return None'));assert.ok(breaks[0].source.includes('(Shr, 1) => (Gt, Gt)'));assert.ok(breaks[0].source.includes('(ShrEq, 2) => (Shr, Eq)'));assert.equal(glue[0].source.includes('(Shr, Gt)'),false);retain('whole-original-token-source',{source,trees,glue,breaks});
});

test('two and three closes preserve exact source positions and unchanged literals and compound assignments',{timeout:5000},()=>{
 const observations=[];for(const text of ['>>','>>>','>>>>','Arc<RwLock<Option<String>>>','A<B<C<D<E>>>>','const λ😀="literal >>>"; >>>','(>>>)[>>]']){const trees=originalMacroTrees(text),gt=flat(trees).filter(tree=>tree.text==='>');for(const token of gt){assert.equal(token.span.end-token.span.start,1);assert.equal(text.slice(token.span.start,token.span.end),'>');assert.equal(token.sourceSha256,hash(text));}assert.equal(macroTreeSource(trees).source,text);assert.equal(gt.length,text.startsWith('const ')?3:[...text].filter(char=>char==='>').length);observations.push({source:text,trees});}
 for(const source of ['>=','>>=','>>>=','=>','->','"literal >>>"','r">>>"']){const trees=originalMacroTrees(source);assert.equal(trees.map(originalMacroTreeText).join(' '),source);observations.push({source,trees});}retain('exact-spans-and-unchanged-domains',observations);
});

test('genuine declarative forwarding retains every close and nested type syntax without unsealing opaque types',{timeout:5000},()=>{
 const compile=source=>compileDeclarativeMacro(source,{name:'probe',owner:['fixture']}),literal=compile('macro_rules! probe{(> > >)=>{matched}}'),input=originalMacroTrees('>>>'),result=expandDeclarativeMacro(literal,input);assert.equal(result.trees[0].text,'matched');assert.equal(result.generatedBehavior,false);assert.equal(result.namespaceComplete,false);
 const forward=expandDeclarativeMacro(compile('macro_rules! probe{($a:tt $b:tt $c:tt)=>{($a $b $c)}}'),input);assert.equal(expandDeclarativeMacro(literal,declarativeSubInput(forward,[0])).trees[0].text,'matched');assert.throws(()=>expandDeclarativeMacro(literal,structuredClone(declarativeSubInput(forward,[0]))),/original or privately forwarded/);
 const type=expandDeclarativeMacro(compile('macro_rules! probe{($t:ty)=>{($t)}}'),originalMacroTrees('Vec<Vec<Vec<String>>>'));assert.throws(()=>expandDeclarativeMacro(compile('macro_rules! probe{(Vec<Vec<Vec<String>>>)=>{bad}}'),declarativeSubInput(type,[0])),/does not match/);retain('complete-declarative-projections',{input,result,forward,type});
});

test('unchanged budgets and strict generic balance reject incomplete or excess closes',{timeout:5000},()=>{
 assert.throws(()=>originalMacroTrees('>>>',{maxTokens:2}),/token budget/);assert.throws(()=>originalMacroTrees('>>>',{maxBytes:2}),/source budget/);assert.throws(()=>originalMacroTrees('(>>>]'),/mismatched/);assert.equal(macroTreeSource(structuredClone(originalMacroTrees('>>>'))),null);const observations=[];for(const type of ['Arc<RwLock<Option<String>>>','Arc<RwLock<Option<Vec<String>>>>']){const source='#[derive(Clone)]pub struct P{value:'+type+'}',input=builtinPayloadDataInputs({source,span:{start:0,end:source.length}});assert.equal(input.fields[0].typeSource,type);observations.push({source,input});}for(const type of ['Arc<RwLock<Option<String>>','Arc<RwLock<Option<String>>>>','Arc<RwLock<Option<String>>>=other']){const source='#[derive(Clone)]pub struct P{value:'+type+'}';assert.throws(()=>builtinPayloadDataInputs({source,span:{start:0,end:source.length}}),TypeError);observations.push({source,expected:'TypeError'});}retain('complete-bounded-generic-inputs',observations);
});
