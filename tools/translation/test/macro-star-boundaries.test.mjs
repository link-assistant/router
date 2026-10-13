import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {originalMacroTrees,macroTreeSource,originalMacroTreeText} from '../macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput} from '../declarative-token-macros.mjs';
const source=gunzipSync(readFileSync(new URL('../source-profiles/clap-concat/rust-1.89-token.rs.gz',import.meta.url))).toString('utf8'),flat=trees=>trees.flatMap(tree=>tree.kind==='group'?flat(tree.children):[tree]);
function retain(name,value){if(!process.env.ROUTER_DOLLAR_TOKEN_VECTORS)return;mkdirSync(process.env.ROUTER_DOLLAR_TOKEN_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_DOLLAR_TOKEN_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
test('complete pinned original Star and glue source proves two Stars are separate TT punctuators',()=>{
 assert.equal(Buffer.byteLength(source),40118);assert.equal(createHash('sha256').update(source).digest('hex'),'a15e0c1152f601a82bad4f08553ce68dc88aad6cde52c618e30a6d292c4d1751');const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000}),matches=[];function visit(nodes){for(let at=0;at<nodes.length;at++){if(nodes[at].text==='fn'&&nodes[at+1]?.text==='glue'){let end=at+2;while(nodes[end]?.delimiter!=='{'&&end<nodes.length)end++;matches.push(nodes.slice(at,end+1));}if(nodes[at].kind==='group')visit(nodes[at].children);}}visit(trees);assert.equal(matches.length,1);const syntax=matches[0],span={start:syntax[0].span.start,end:syntax.at(-1).span.end},actual=source.slice(span.start,span.end);assert.ok(source.includes('// `*`\n    Star,'));assert.ok(actual.includes('(Star, Eq) => StarEq'));assert.ok(actual.includes('(Star, _) => return None'));assert.equal(actual.includes('(Star, Star)'),false);assert.equal(JSON.stringify(JSON.parse(JSON.stringify(syntax))),JSON.stringify(syntax));retain('original-star-glue-source',{source,span,syntax});
});
test('two-Star projection preserves exact UTF16 spans punctuation adjacency and original literal bytes',()=>{
 for(const written of ['**value','&**normal','***x','****x','(**)','$t**','**->x','**/x']){const prefix='const λ😀="**"; ',text=prefix+written,trees=originalMacroTrees(text),leaves=flat(trees),stars=leaves.filter(tree=>tree.text==='*');assert.equal(stars.length,[...written].filter(ch=>ch==='*').length);for(const token of stars){assert.equal(token.span.end-token.span.start,1);assert.equal(text.slice(token.span.start,token.span.end),'*');}assert.equal(leaves.find(tree=>tree.type==='string').text,'"**"');assert.equal(macroTreeSource(trees).source,text);retain('star-'+written.replace(/[^A-Za-z]/g,''),{source:text,trees});}
 for(const text of ['*=','**=','->','&&','>>=','"**"','r"**"'])assert.equal(originalMacroTrees(text).map(originalMacroTreeText).join(' '),text);
});
test('actual two-Star literal and TT matchers retain privately forwarded output and unchanged type opacity',()=>{
 const compile=source=>compileDeclarativeMacro(source,{name:'probe',owner:['fixture']}),literal=compile('macro_rules! probe{(**)=>{matched}}'),proof=expandDeclarativeMacro(literal,originalMacroTrees('**'));assert.equal(proof.trees[0].text,'matched');assert.equal(proof.generatedBehavior,false);assert.equal(proof.namespaceComplete,false);
 const tt=expandDeclarativeMacro(compile('macro_rules! probe{($a:tt $b:tt)=>{($a $b)}}'),originalMacroTrees('**'));assert.equal(expandDeclarativeMacro(literal,declarativeSubInput(tt,[0])).trees[0].text,'matched');assert.throws(()=>expandDeclarativeMacro(literal,structuredClone(declarativeSubInput(tt,[0]))),/original or privately forwarded/);
 const ty=expandDeclarativeMacro(compile('macro_rules! probe{($t:ty)=>{($t)}}'),originalMacroTrees('*const *const u8'));assert.throws(()=>expandDeclarativeMacro(compile('macro_rules! probe{(*const *const u8)=>{bad}}'),declarativeSubInput(ty,[0])),/does not match/);retain('star-matchers',{proof,tt,ty});
});
test('source and delimiter budgets remain unchanged for Star projection',()=>{
 assert.throws(()=>originalMacroTrees('**',{maxTokens:1}),/token budget/);assert.throws(()=>originalMacroTrees('**',{maxBytes:1}),/source budget/);assert.throws(()=>originalMacroTrees('(**]'),/mismatched/);assert.equal(macroTreeSource(structuredClone(originalMacroTrees('**'))),null);
});
