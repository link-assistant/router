import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,astFragmentText} from '../builtin-derive-ast-meta.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),attr='compiler/rustc_ast/src/attr/mod.rs';
test('complete original Default attribute and visitor source share the exact immutable Rust revision',()=>{
 const origin=builtinAstOriginal(profile,attr),visitor=builtinAstOriginal(profile,'compiler/rustc_ast/src/visit.rs');assert.equal(origin.revision,'29483883eed69d5fb4db01964cdf2af4d86e9cb2');assert.equal(visitor.revision,origin.revision);assert.equal(origin.bytes,29412);assert.equal(origin.sha256,'48133e6b040d81c61ab6a0d33ea698e9f5032578c7df09fa95ebcbdbb84397b8');assert.equal(visitor.sha256,'2cde31625ec47f907d6a314ae06e75711245ca79f8dc1f5bf5b44768c6dc87fd');assert.equal(visitor.reusedProfile,'clap-concat/manifest.json');
 for(const source of [origin,visitor]){assert.equal(source.namespaceAuthority,false);assert.equal(source.generatedImplBehavior,false);assert.throws(()=>builtinAstOriginal(structuredClone(profile),source.path),/Unsealed/);}
});
test('actual original attribute helper bodies retain their single-segment and empty-argument semantics',()=>{
 const selected=[['filter_by_name',null,'attrs.iter().filter(move |attr| attr.has_name(name))'],['find_by_name',null,'filter_by_name(attrs, name).next()'],['contains_name',null,'find_by_name(attrs, name).is_some()'],['has_name','AttributeExt::has_name(self, name)','AttributeExt::has_name(self, name)'],['has_name','self.ident().map(|x| x.name == name).unwrap_or(false)','self.ident().map(|x| x.name == name).unwrap_or(false)'],['ident','if let [ident] = &*normal.item.path.segments','AttrKind::DocComment(..) => None'],['is_word','AttributeExt::is_word(self)','AttributeExt::is_word(self)'],['is_word','matches!(normal.item.args, AttrArgs::Empty)','matches!(normal.item.args, AttrArgs::Empty)']];
 for(const [name,selector,expected]of selected){const recipe=originalAstFunction(profile,attr,name,selector);assert.ok(astFragmentText(recipe).includes(expected));assert.equal(recipe.semanticSyntaxRoundTrip,true);assert.throws(()=>astFragmentText(structuredClone(recipe)),/Unsealed/);}
});
test('original Default visitor callbacks and dispatch remain retained source without generated/runtime authority',()=>{
 const path='compiler/rustc_builtin_macros/src/deriving/default.rs',entry=originalAstFunction(profile,path,'expand_deriving_default'),callback=originalAstFunction(profile,path,'default_enum_substructure'),dispatch=originalAstFunction(profile,'compiler/rustc_expand/src/base.rs','visit_with');assert.ok(astFragmentText(entry).includes('item.visit_with(&mut DetectNonVariantDefaultAttr { cx })'));assert.ok(astFragmentText(callback).includes('validate_default_attribute(cx, default_variant)?'));assert.ok(astFragmentText(dispatch).includes('Annotatable::Item(item) => visitor.visit_item(item)'));
 const visitor=builtinAstOriginal(profile,'compiler/rustc_ast/src/visit.rs');for(const name of ['walk_item','walk_attribute','walk_variant'])assert.ok(visitor.source.includes('pub fn '+name+'<'));
 // The complete source is retained, including the compiler's actual unstable
 // metavariable expressions. This prerequisite does not rewrite them or claim
 // the current bounded token grammar already projects their function bodies.
 assert.ok(visitor.source.includes('${ignore($lt)}'));assert.throws(()=>originalAstFunction(profile,visitor.path,'walk_item'),/metavariable requires bounded original spelling/);
});
