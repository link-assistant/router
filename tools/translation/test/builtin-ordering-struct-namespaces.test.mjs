// Whole ordinary struct branch, preserving original private invocation joins.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
function setup(source,name){const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(row=>row.name==='Record'),attribute=certificate.attributes.find(row=>row.derives?.some(path=>path.join('::')===name));return {context,certificate,invocation:{path:[name],attributeSpan:attribute.span}};}
function retain(name,value){const directory=process.env.ROUTER_STRUCT_ORDERING_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,name+'.json.gz'),value);}}
const item=count=>'#[derive(Ord,PartialOrd)]pub struct Record{'+Array.from({length:count},(_,index)=>'pub field'+index+':u8').join(',')+'}';
for(const count of [0,1,3,128])test('original struct ordering closes every field and fold branch for '+count+' fields',{timeout:60000},()=>{
 const source=item(count),all=[];
 for(const name of ['Ord','PartialOrd']){const args=setup(source,name),proof=proveBuiltinDeriveBangFootprint(args),route=proof.route,method=route.implementations[0].associatedItems[0],closure=method.recursiveNamespaceClosure;all.push({name,args,proof});
  assert.equal(route.schema,'original-struct-ordering-ast-route-v1');assert.equal(closure.comparisons,count);assert.equal(closure.matches,Math.max(0,count-1));assert.equal(closure.immutableFieldBorrows,count*2);assert.equal(closure.bodyExpressionComplete,true);assert.equal(method.statements.length,0);
  assert.equal(route.typedSource.fields.length,count);assert.ok(route.typedSource.fields.every(field=>field.semanticSyntaxRoundTrip));assert.deepEqual(route.sourceFieldInputs.map(field=>field.name),Array.from({length:count},(_,i)=>'field'+i));
  // Walk the actual emitted syntax tree: first field is the outer scrutinee,
  // Equal enters the next field and cmp returns immediately from that arm.
  const order=[];let body=method.body;
  for(let i=0;i<Math.max(0,count-1);i++){assert.equal(body.constructor.variant.name,'Match');assert.equal(body.slots.matchKind,'Prefix');const arms=body.slots.arms;assert.equal(arms[1].pattern.slots.ident,'cmp');assert.deepEqual(arms[1].body.slots.path.segments,['cmp']);let equal=arms[0].pattern;if(name==='PartialOrd'){assert.equal(equal.constructor.variant.name,'TupleStruct');assert.equal(equal.slots.path.segments.at(-1),'Some');equal=equal.slots.children[0];}assert.equal(equal.constructor.variant.name,'Path');assert.equal(equal.slots.path.segments.at(-1),'Equal');order.push(body.slots.argument.slots.args[0].slots.e.slots.ident);body=arms[0].body;}
  if(count)order.push(body.slots.args[0].slots.e.slots.ident);assert.deepEqual(order,Array.from({length:count},(_,i)=>'field'+i));
  if(!count){assert.equal(body.constructor.variant.name,name==='Ord'?'Path':'Call');assert.equal((name==='Ord'?body:body.slots.args[0]).slots.path.segments.at(-1),'Equal');}
  for(const key of ['copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior'])assert.equal(route[key],false);
 }
 retain('fields-'+count,{source,all});
});
test('ordinary unit structs preserve Fieldless and copied source contexts cannot issue authority',{timeout:60000},()=>{
 const source='#[derive(Ord,PartialOrd)]pub struct Record;',all=[];
 for(const name of ['Ord','PartialOrd']){const args=setup(source,name),proof=proveBuiltinDeriveBangFootprint(args);assert.equal(proof.route.sourceControls.selectedCsFold,'Struct(empty) → Fieldless');assert.throws(()=>assertBuiltinDeriveBangFootprint(structuredClone(proof),args.context,args.certificate,args.invocation),/original invocation/);assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,certificate:structuredClone(args.certificate)}));all.push({name,args,proof});}
 retain('unit-and-private-controls',{source,all});
});
test('generic packed tuple conditional macro and competing owner struct inputs remain refused',{timeout:60000},()=>{
 const sources=['#[derive(Ord)]struct Record<T>{field:T}','#[derive(Ord)]struct Record(u8);','#[repr(packed)]'+item(1),'#[cfg(feature="unknown")]'+item(1),'#[derive(Ord)]struct Record{#[unknown]field:u8}','#[derive(Ord)]struct Record{field:made!()}','use custom::Ord;#[derive(Ord)]struct Record{field:u8}','#[derive(Ord,Unknown)]struct Record{field:u8}'],all=[];
 for(const source of sources){const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),bang=createDeriveBangContext({deriveContext:context});all.push({source,context,bang});assert.equal(bang.certificates.some(row=>row.dimensions.bangMacroComplete),false,source);}
 retain('complete-refusals',{sources,all});
});
test('closed struct ordering removes primitive str namespace uncertainty in both strict targets',{timeout:60000},async()=>{
 const source=item(3)+'pub fn byte_length(value:&str)->usize{value.len()}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});retain('complete-str-namespace-result',{source,result});assert.ok(result.meta.executable.some(row=>row.name==='byte_length'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.byte_length('CSV'),3n);assert.equal(api.byte_length(''),0n);assert.equal(api.byte_length('é'),2n);});
});
