import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {originalMacroTrees,macroTreeSource} from '../macro-token-trees.mjs';
import {compileDeclarativeMacro} from '../declarative-token-macros.mjs';
import {rustTokens} from '../rust-structure.mjs';
const source=gunzipSync(readFileSync(new URL('../source-profiles/clap-concat/rust-1.89-visit.rs.gz',import.meta.url))).toString('utf8');
function leaves(trees){return trees.flatMap(tree=>tree.kind==='group'?leaves(tree.children):[tree]);}
function retain(name,value){if(!process.env.ROUTER_DOLLAR_TOKEN_VECTORS)return;mkdirSync(process.env.ROUTER_DOLLAR_TOKEN_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_DOLLAR_TOKEN_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
test('adjacent original dollar/name boundaries preserve exact UTF16 spans without changing spelling domains',()=>{
 for(const written of ['$a$b','$a$','$a$$b','$$','$Visitor$(<$lt>)?','$left$right!']){const prefix='const λ😀="unchanged $text";',text=prefix+written,trees=originalMacroTrees(text),flat=leaves(trees);retain('boundary-'+written.replace(/[^a-zA-Z]/g,''),{source:text,trees});for(const token of flat.filter(token=>token.span.start>=prefix.length))assert.equal(text.slice(token.span.start,token.span.end),token.text);const dollars=flat.filter(token=>token.text==='$');assert.equal(dollars.length,[...written].filter(ch=>ch==='$').length);assert.ok(dollars.every(token=>token.span.end-token.span.start===1));assert.equal(flat.find(token=>token.type==='string').text,'"unchanged $text"');}
});
test('complete original visitor tokens retain every dollar boundary documentation and metavariable-expression group',()=>{
 const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),flat=leaves(trees),fused=rustTokens(source).filter(token=>token.type==='ident'&&token.text==='$Visitor$');assert.equal(fused.length,67);
 for(const token of fused){const selected=flat.filter(value=>value.span.start>=token.start&&value.span.end<=token.end);assert.deepEqual(selected.map(value=>value.text),['$','Visitor','$']);assert.equal(selected.map(value=>source.slice(value.span.start,value.span.end)).join(''),token.text);assert.equal(selected[0].span.start,token.start);assert.equal(selected.at(-1).span.end,token.end);}
 let expressions=0;function visit(nodes){for(let index=0;index<nodes.length;index++){if(nodes[index].text==='$'&&nodes[index+1]?.delimiter==='{'){const group=nodes[index+1];assert.equal(group.children[0].text,'ignore');assert.equal(source.slice(group.span.start,group.span.end),'{ignore('+group.children[1].children.map(child=>child.text).join('')+')}');expressions++;}if(nodes[index].kind==='group')visit(nodes[index].children);}}visit(trees);assert.ok(expressions>0);assert.ok(flat.some(token=>token.sourceFeature==='original-line-doc-comment'));assert.equal(macroTreeSource(trees).source,source);assert.equal(macroTreeSource(structuredClone(trees)),null);assert.ok(Object.isFrozen(trees));retain('whole-original-visitor',{source,trees,fused,expressions});
});
test('retained bracketed expressions and lifetime matcher syntax do not grant transcriber or source owner authority',()=>{
 const written='macro_rules! probe{($v:ident)=>{${ignore($v)}}}',trees=originalMacroTrees(written);assert.ok(trees.length);assert.throws(()=>compileDeclarativeMacro(written,{name:'probe',owner:['test']}),/metavariable needs an original identifier/);
 assert.throws(()=>compileDeclarativeMacro('macro_rules! probe{($v:lifetime)=>{$v}}',{name:'probe',owner:['test']}),/fragment is outside/);
 for(const written of ['$λ','$fooé','$!','$a$!'])assert.throws(()=>originalMacroTrees(written),/bounded original spelling/);
 assert.deepEqual(originalMacroTrees('$r#value').map(tree=>tree.text),['$','r','#','value'],'retained punctuation does not certify raw identifier semantics');
 assert.throws(()=>originalMacroTrees(source,{maxTokens:8}),/token budget/);assert.throws(()=>originalMacroTrees('$a$',{maxBytes:2}),/source budget/);
 const constructor=originalMacroTrees('constructor ($a$b)');assert.equal(constructor[0].text,'constructor');assert.equal(constructor[1].delimiter,'(');assert.throws(()=>originalMacroTrees('$a$(]'),/mismatched/);assert.throws(()=>originalMacroTrees('/** unsupported doc */$a$b'),/block documentation/);
});
