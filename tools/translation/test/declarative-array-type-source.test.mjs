import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroArrayTypeRules,assertOriginalMacroArrayTypeRules,originalMacroArrayLiteralLength,originalMacroArrayTypeInput} from '../macro-array-type-source.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeNamespaceObservation} from '../declarative-token-macros.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations,originalMacroTreeText} from '../macro-token-trees.mjs';
const root=new URL('../source-profiles/macro-array-types/',import.meta.url),profile=JSON.parse(readFileSync(new URL('manifest.json',root))),hash=value=>createHash('sha256').update(value).digest('hex');
const definition=()=>compileDeclarativeMacro('macro_rules! input{($t:ty)=>{($t)};}',{name:'input',owner:['fixture']}),render=expansion=>expansion.trees.map(originalMacroTreeText).join(' ');
test('whole original parser array/slice and literal branches retain exact source and schema spans',()=>{
 const rules=originalMacroArrayTypeRules();assert.equal(assertOriginalMacroArrayTypeRules(rules),rules);assert.equal(originalMacroArrayTypeRules(),rules);assert.equal(rules.recipes.length,9);for(const pin of profile.sources){const packed=readFileSync(new URL(pin.archive,root)),original=originalMacroArrayTypeInput(pin.path,packed);assert.equal(hash(original.source),pin.sha256);assert.equal(original.layoutAuthority,false);const changed=Buffer.from(packed);changed[changed.length-1]^=1;assert.throws(()=>originalMacroArrayTypeInput(pin.path,changed),/archive changed/);for(const recipe of rules.recipes.filter(row=>row.sourcePath===pin.path)){assert.equal(original.source.slice(recipe.span.start,recipe.span.end),recipe.original);assert.equal(hash(recipe.original),recipe.sha256);}}
 for(const flag of ['fullParserExecuted','layoutAuthority','constEvaluationAuthority','namespaceAuthority','runtimeAuthority'])assert.equal(rules[flag],false,flag);
});
test('recursive source type capture accepts arrays/slices while preserving each opaque type boundary',()=>{
 const macro=definition();for(const type of ['[u8]','[u8;0]','[P<ast::Item>;1]','SmallVec<[P<ast::Item>;1]>','[[u8;2];3]','([u8;1],[u16])','[u8;18446744073709551616]']){const out=expandDeclarativeMacro(macro,originalMacroTrees(type)),fragment=out.trees[0].children[0];assert.equal(fragment.kind,'fragment');assert.equal(fragment.fragment,'ty');assert.deepEqual(fragment.trees,originalMacroTrees(type));assert.equal(out.ownerVerified,false);assert.equal(render(out),'('+originalMacroTrees(type).map(originalMacroTreeText).join(' ')+')');}
});
test('unknown const expressions and unsupported literal forms remain refused',()=>{
 const macro=definition();for(const type of ['[]','[u8;]','[u8;N]','[u8;1+1]','[u8;{1}]','[u8;size!()]','[u8;-1]','[u8;1usize]','[u8;1.0]','[u8;01]','[u8;0xff]','[u8;true]','[u8;"1"]','[u8;100000000000000000000]','[u8,u16]'])assert.throws(()=>expandDeclarativeMacro(macro,originalMacroTrees(type)),/does not match/);
});
test('full actual make_MacEager invocation expands all eight slots without source rewriting',()=>{
 const packed=readFileSync(new URL('../source-profiles/clap-concat/rust-1.89-base.rs.gz',import.meta.url)),source=gunzipSync(packed).toString(),calls=originalTopLevelMacroInvocations(source).filter(row=>row.path.join('::')==='make_MacEager');assert.equal(calls.length,1);const input=calls[0],definition=compileDeclarativeMacro(source,{name:'make_MacEager',owner:['rustc_expand','base']}),out=expandDeclarativeMacro(definition,input.trees),text=render(out);assert.equal(out.trees.length,13);for(const field of ['expr','pat','items','impl_items','trait_items','foreign_items','stmts','ty']){assert.ok(text.includes('pub '+field+' : Option <'),field);assert.ok(text.includes('fn '+field+' ('),field);}assert.ok(text.includes('ast :: Item'));assert.ok(text.includes('. . Default :: default ()'));const facts=declarativeNamespaceObservation(out);assert.equal(facts.ownerVerified,false);assert.equal(facts.generatedBehavior,false);assert.equal(facts.dimensions.typeNamespaceComplete,false);assert.equal(hash(source.slice(input.sourceSpan.start,input.sourceSpan.end)),input.sourceSha256);
});
test('type arrays retain forwarding opacity, source identity, depth and output budgets',()=>{
 const outer=compileDeclarativeMacro('macro_rules! outer{($t:ty)=>{inner!($t)};}',{name:'outer',owner:['fixture']}),inner=compileDeclarativeMacro('macro_rules! inner{([u8;1])=>{true};}',{name:'inner',owner:['fixture']}),out=expandDeclarativeMacro(outer,originalMacroTrees('[u8;1]'));
 assert.throws(()=>expandDeclarativeMacro(inner,declarativeSubInput(out,[2])),/does not match/);assert.throws(()=>expandDeclarativeMacro(definition(),JSON.parse(JSON.stringify(originalMacroTrees('[u8;1]')))),/original or privately forwarded/);assert.throws(()=>expandDeclarativeMacro(definition(),originalMacroTrees('['.repeat(25)+'u8'+']'.repeat(25))),/type fragment budget/);assert.throws(()=>expandDeclarativeMacro(definition(),originalMacroTrees('[u8;1]'),{output:1}),/budget/);
});
test('copied/foreign/getter rules cannot authorize a fragment; value evaluation is never added',()=>{
 const rules=originalMacroArrayTypeRules();let reads=0;for(const fake of [structuredClone(rules),Object.freeze({...rules}),new Proxy(rules,{}),Object.defineProperty({},'schema',{get(){reads++;return rules.schema;}})]){assert.throws(()=>assertOriginalMacroArrayTypeRules(fake),/genuine/);assert.throws(()=>originalMacroArrayLiteralLength(fake,{kind:'token',type:'number',text:'1'}),/genuine/);}assert.equal(reads,0);const node=Object.defineProperty({kind:'token',type:'number'},'text',{get(){reads++;return '1';}});assert.equal(originalMacroArrayLiteralLength(rules,node),false);assert.equal(reads,0);
});
