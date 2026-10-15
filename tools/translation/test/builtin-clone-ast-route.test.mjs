import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint,isBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {builtinDeriveDataInputs} from '../builtin-derive-data-inputs.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {liftBuiltinCloneAstRoute,builtinCloneOriginalSourcePlan,validateBuiltinCloneAstOutput} from '../builtin-clone-ast-route.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
function setup(source,profile=PRODUCTION_PROFILE){const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:profile}),certificate=context.certificates[0],attribute=certificate?.attributes.find(a=>a.derives?.some(path=>path.join('::')==='Clone'));return {modules,context,certificate,invocation:attribute&&{path:['Clone'],attributeSpan:attribute.span}};}
const prove=source=>proveBuiltinDeriveBangFootprint(setup(source));
function retain(name,source,proof){if(!process.env.ROUTER_CLONE_NAMESPACE_VECTORS)return;mkdirSync(process.env.ROUTER_CLONE_NAMESPACE_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_CLONE_NAMESPACE_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify({source,proof,plan:proof.schema==='builtin-clone-bang-output-v1'?builtinCloneOriginalSourcePlan(proof.route):null})));}
function body(proof,branch=0){return proof.route.branches[branch].output.items[0].body;}
for(const [name,declaration]of [
 ['named','pub struct P{v:String,other:Vec<Option<String>>,nested:other::Record}'],
 ['nine','pub struct P{a:String,b:Option<String>,c:Vec<String>,d:serde_json::Value,e:Other,f:bool,g:u8,h:u8,i:Vec<String>}'],
 ['unit','pub struct P;'],['empty-named','pub struct P{}'],
 ['single-enum','pub enum P{One}'],['four-enum','pub enum P{One,Two,Three,Four}'],
])test('source-selected Clone recursively closes '+name+' with both actual resolver outcomes',()=>{
 const source='#[derive(Clone,serde::Serialize)]'+declaration,proof=prove(source),route=proof.route,plan=builtinCloneOriginalSourcePlan(route);retain(name,source,proof);
 assert.equal(proof.schema,'builtin-clone-bang-output-v1');assert.deepEqual(route.branches.map(b=>b.feature),['has_derive_copy=false','has_derive_copy=true']);assert.equal(validateBuiltinCloneAstOutput(route,structuredClone(route.branches)),true);
 for(const branch of route.branches){assert.equal(branch.output.items.length,1);const method=branch.output.items[0];assert.equal(method.name,'clone');assert.equal(method.parameters.length,1);assert.equal(method.parameters[0].receiver.pointee,'TyKind::ImplicitSelf');assert.equal(method.body.tokens,null);assert.equal(method.contract,null);assert.equal(method.define_opaque,null);}
 assert.equal(body(proof,1).statements[0].expr.constructor.variant.name,'Unary');assert.equal(body(proof,1).typeOnlyStatements.candidates.length,route.typedSource.fields.length);
 assert.ok(plan.positiveVariants.some(v=>v.owner==='PatKind'&&v.name==='Ident'));assert.ok(plan.recipes.some(r=>r.source.endsWith('/parser/item.rs')));assert.ok(plan.compileMeta.some(c=>c.schema==='original-ast-builder-contract-meta-v1'));
 for(const key of ['copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior'])assert.equal(proof[key],false);assert.equal(proof.dimensions.bangMacroComplete,true);for(const key of ['typeNamespaceComplete','valueNamespaceComplete','attributeMacroComplete'])assert.equal(proof.dimensions[key],false);
 if(name==='four-enum'){const match=body(proof).statements[0].expr;assert.equal(match.constructor.variant.name,'Match');assert.equal(match.slots.arms.length,4);assert.equal(match.slots.matchKind,'Prefix');for(const arm of match.slots.arms){assert.equal(arm.guard,null);assert.equal(arm.pat.constructor.variant.name,'Path');assert.equal(arm.body.constructor.variant.name,'Path');}}
 if(name==='single-enum'||name==='unit')assert.equal(body(proof).statements[0].expr.constructor.variant.name,'Path');
 if(name==='nine')assert.equal(body(proof).statements[0].expr.slots.fields.length,9);
});
test('actual scalar and Eq successes retain their independent existing proof schemas',()=>{
 const scalar=prove('#[derive(Clone,serde::Serialize)]pub struct P{v:u8}');assert.equal(scalar.schema,'builtin-scalar-bang-output-v1');assert.equal(scalar.route.schema,'original-builtin-scalar-ast-output-v1');
 const source='#[derive(Eq,serde::Serialize)]pub struct P{v:String}',args=setup(source),certificate=args.context.certificates[0],attribute=certificate.attributes.find(a=>a.name==='derive'),eq=proveBuiltinDeriveBangFootprint({...args,certificate,invocation:{path:['Eq'],attributeSpan:attribute.span}});assert.equal(eq.schema,'builtin-eq-bang-output-v1');assert.equal(eq.slotProofs.outputKind.initializerCount,0);
});
test('Clone source field spans and helper docs remain joined to genuine original owners',()=>{
 const source='#[derive(Clone,serde::Serialize)]pub struct P{/// λ😀 actual\n#[serde(default,skip_serializing_if="Vec::is_empty")]pub(crate) items: Vec<String>}',proof=prove(source);retain('helper-spans',source,proof);assert.equal(proof.originalHelperOwners.length,1);assert.equal(proof.originalHelperOwners[0].exactNestedHelperInert,true);
 const field=proof.route.typedSource.fields[0];assert.equal(source.slice(field.fieldInfoSpan.span.start,field.fieldInfoSpan.span.end),'pub(crate) items: Vec<String>');assert.equal(source.slice(field.fieldInfoSpan.nameSpan.start,field.fieldInfoSpan.nameSpan.end),'items');assert.equal(source.slice(field.fieldInfoSpan.typeSpan.start,field.fieldInfoSpan.typeSpan.end),'Vec<String>');
 const enumeration='#[derive(Clone,Copy,Default,serde::Serialize)]pub enum P{One,#[default]Two}',enumProof=prove(enumeration);assert.equal(enumProof.originalHelperOwners.length,1);assert.equal(enumProof.copyAuthority,false);retain('default-helper',enumeration,enumProof);
});
test('complete positive AST comparison refuses macros items guards source-slot and wrapper injections',()=>{
 const source='#[derive(Clone,serde::Serialize)]pub struct P{v:String,other:String}',proof=prove(source),route=proof.route;
 const mutations=[b=>{b[0].output.items.push({kind:'macro_rules!'});},b=>{b[0].output.items[0].body.statements.push({kind:'Stmt',variant:'Item',item:{kind:'macro_export'}});},b=>{b[0].output.items[0].body.statements[0].expr.constructor.variant.name='MacCall';},b=>{b[0].output.items[0].body.statements[0].expr.slots.fields[0].attrs.push('unknown');},b=>{b[0].output.items[0].parameters[0].pat.tokens='generated!()';},b=>{b[1].output.items[0].body.typeOnlyStatements.candidates[0].local.initializer={kind:'ExprKind::MacCall'};},b=>{b[0].output.items[0].body.statements[0].expr.slots.fields[0].expr.slots.args=[];},b=>{b[0].output.items[0].body.statements[0].expr.slots.fields[0].expr.slots.args[0].slots.e.slots.ident='other';}];
 for(const mutate of mutations){const branches=structuredClone(route.branches);mutate(branches);assert.throws(()=>validateBuiltinCloneAstOutput(route,branches),/positive AST/);}
 const enumeration=prove('#[derive(Clone,serde::Serialize)]pub enum P{A,B}'),branches=structuredClone(enumeration.route.branches);branches[0].output.items[0].body.statements[0].expr.slots.arms[0].guard={kind:'ExprKind::MacCall'};assert.throws(()=>validateBuiltinCloneAstOutput(enumeration.route,branches),/positive AST/);
 let calls=0;const getter=structuredClone(route.branches);Object.defineProperty(getter[0],'output',{enumerable:true,get(){calls++;return route.branches[0].output;}});assert.throws(()=>validateBuiltinCloneAstOutput(route,getter));assert.equal(calls,0);assert.throws(()=>validateBuiltinCloneAstOutput(route,new Proxy(route.branches,{ownKeys(){calls++;return [];}})));assert.equal(calls,0);
});
test('copied source recipes candidates profile and public output metadata never replace private input joins',()=>{
 const source='#[derive(Clone,serde::Serialize)]pub struct P{v:String}',args=setup(source),proof=proveBuiltinDeriveBangFootprint(args),profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','expand_deriving_clone'),input=builtinDeriveDataInputs({source,span:args.certificate.span}),original={dependencies,module:{source}};
 for(const fake of [structuredClone(proof),Object.freeze(structuredClone(proof))]){assert.equal(isBuiltinDeriveBangFootprint(fake),false);assert.throws(()=>assertBuiltinDeriveBangFootprint(fake,args.context,args.certificate,args.invocation));assert.throws(()=>validateBuiltinCloneAstOutput(fake.route,proof.route.branches));}
 for(const replacement of [{entry:structuredClone(entry)},{profile:structuredClone(profile)},{input:{...input,fields:[]}},{input:{...input,name:'Other'}},{original:{dependencies,module:{source:source+' '}}}])assert.throws(()=>liftBuiltinCloneAstRoute({profile,original,certificate:args.certificate,entry,input,...replacement}));
 for(const replacement of [{certificate:structuredClone(args.certificate)},{context:structuredClone(args.context)},{context:setup(source+' ').context},{context:setup(source,compilationProfile({flags:{test:true}})).context},{invocation:{path:['Clone'],attributeSpan:{start:1,end:2}}}])assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,...replacement}));
 const forged=builtinDeriveDataInputs({source,span:args.certificate.span});assert.equal(proveBuiltinDeriveBangFootprint({...args,input:{...forged,fields:[]}}).route.typedSource.fields.length,1);
});
test('unknown cfg generic repr discriminant type macros and ancestor shadows stay refused',()=>{
 for(const written of ['pub struct P<T>{v:T}','pub struct P where P:Other{v:String}','pub union P{v:u8}','pub struct P(String);','pub enum P{}','pub enum P{A=1,B}','pub struct P{v:generated!()}','pub struct P{v:[u8;generated!()]}','pub struct P{v:u8=1}','#[repr(packed)]pub struct P{v:String}','#[cfg(test)]pub struct P{v:String}'])assert.throws(()=>prove('#[derive(Clone,serde::Serialize)]'+written),undefined,written);
 const payload='#[derive(Clone,serde::Serialize)]pub enum P{A(String),B}',payloadProof=prove(payload);assert.equal(payloadProof.selectedOwnerBangComplete,true);assert.equal(payloadProof.generatedImplBehavior,false);assert.equal(payloadProof.route.typedSource.variants[0].fields[0].typeSource,'String');retain('retained-original-payload',payload,payloadProof);
 const valid='#[derive(Clone,serde::Serialize)]pub struct P{v:String}';for(const source of ['use custom::Clone;'+valid,'use custom::inline;'+valid,'use custom::automatically_derived;'+valid,'#[unknown]mod ancestor{'+valid+'}',valid+'unknown!();','#[derive(Clone,serde::Serialize)]pub struct P{#[unknown]v:String}','#[derive(Clone)]pub struct P{#[serde(default)]v:String}']){const args=setup(source),bang=createDeriveBangContext({deriveContext:args.context});assert.equal(bang.certificates.some(c=>c.selectedOwners.some(owner=>owner.target.join('::')==='core::Clone')),false,source);}
});
test('independent Clone Debug Default PartialEq and JsonSchema source outputs close every actual sibling',()=>{
 const source='#[derive(Clone,Debug,Default,PartialEq,schemars::JsonSchema,serde::Serialize)]pub struct P{v:String}',args=setup(source),bang=createDeriveBangContext({deriveContext:args.context}),certificate=bang.certificates[0];assert.ok(certificate.selectedOwners.some(owner=>owner.target.join('::')==='core::Clone'));assert.ok(certificate.selectedOwners.some(owner=>owner.target.join('::')==='core::Debug'));assert.ok(certificate.selectedOwners.some(owner=>owner.target.join('::')==='core::PartialEq'));assert.ok(certificate.selectedOwners.some(owner=>owner.target.join('::')==='core::Default'));assert.ok(certificate.selectedOwners.some(owner=>owner.target.join('::')==='schemars::JsonSchema'));assert.deepEqual(certificate.residualOwners,[]);assert.equal(certificate.dimensions.bangMacroComplete,true);assert.equal(certificate.generatedImplBehavior,false);
});
test('Clone namespace confinement preserves independent executable JS and strict TS behavior',{timeout:60000},async()=>{
 const source='#[derive(Clone,serde::Serialize)]pub struct P{v:String}pub fn accepted(v:Option<u8>)->bool{matches!(v,Some(n) if n>2)}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.ok(result.meta.executable.some(row=>row.name==='accepted'));
 await verifyTypedTargets(result,api=>{assert.equal(api.accepted(Object.freeze({$:'None'})),false);for(const [n,want]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.accepted(Object.freeze({$:'Some',field0:n})),want);assert.throws(()=>api.accepted({$:'Some',field0:3n}),TypeError);assert.throws(()=>api.accepted(Object.freeze({$:'Some',field0:256n})),TypeError);},{childTimeoutMs:20000});
});
