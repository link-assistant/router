import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {originalBuiltinDefaultBangOutput,assertBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {builtinDefaultOriginalSourcePlan,validateBuiltinDefaultAstOutput,originalBuiltinDefaultAstOutput} from '../builtin-default-ast-route.mjs';
import {builtinVisitorFunctionText} from '../builtin-visitor-source.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal} from '../builtin-derive-ast-meta.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),profile=builtinDeriveAstSourceProfile(dependencies);
const sha=source=>createHash('sha256').update(source).digest('hex');
function retain(name,value){if(!process.env.ROUTER_DEFAULT_STATIC_VECTOR_DIR)return;mkdirSync(process.env.ROUTER_DEFAULT_STATIC_VECTOR_DIR,{recursive:true});writeFileSync(join(process.env.ROUTER_DEFAULT_STATIC_VECTOR_DIR,name+'.json.gz'),gzipSync(JSON.stringify(value)));}
function setup(source,name='Record',file='src/lib.rs'){
  const context=createDeriveFootprintContext({modules:[{file,path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
  const certificate=context.certificates.find(row=>row.name===name),attribute=certificate?.attributes.find(row=>row.derives?.some(path=>path.join('::')==='Default'));
  return {context,certificate,invocation:attribute&&{path:['Default'],attributeSpan:attribute.span}};
}
const prove=(source,name,file)=>originalBuiltinDefaultBangOutput(setup(source,name,file));
const compile=(source,entry='src/lib.rs')=>translateProject({entry,paths:[entry],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
function noBehavior(joined){for(const key of ['namespaceAuthority','runtimeAuthority','copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior'])assert.equal(joined.route[key]??joined.proof[key],false,key);assert.equal(joined.proof.dimensions.typeNamespaceComplete,false);assert.equal(joined.proof.dimensions.bangMacroComplete,true);}
function staticTokens(value){const found=[];function visit(node){if(!node||typeof node!=='object')return;if(node.tokenType==='lifetime')found.push(node.text);for(const value of Object.values(node))if(value&&typeof value==='object')visit(value);}visit(value);return found;}

test('complete unchanged EmergencyAuthConfig original Default executes JS and strict TS',{timeout:60000},async()=>{
  const file='src/emergency_auth.rs',source=readFileSync(new URL(file,root),'utf8'),result=compile(source,file);
  retain('01-complete-emergency',{source,sha256:sha(source),result});
  assert.ok(result.meta.checkedMethods.some(row=>row.name==='EmergencyAuthConfig.default'));
  const wire=JSON.stringify(result.meta.targetSemanticProgram),program=parseProgram(wire);assert.equal(serializeProgram(program),wire);
  const methods=[...program.declarations.values()].filter(row=>row.impl?.method==='default');assert.equal(methods.length,1);const method=methods[0],checked=result.meta.checkedMethods.find(row=>row.name==='EmergencyAuthConfig.default');assert.ok(checked);assert.deepEqual(checked.defaultSourceAdmission.typePath,['crate','EmergencyAuthConfig']);assert.equal(checked.source,file);assert.deepEqual(method.span,checked.span);assert.equal(method.impl.receiver,checked.receiver);assert.equal(method.sourceNamespaceEvidence.source,file);
  assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedTypeScope,false);assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedAttributeMacroScope,false);assert.equal(result.meta.runtimeParity,false);
  const exported={...result,javascript:result.javascript+`\nexport {${method.fullName} as originalDefault};`,typescript:result.typescript+`\nexport {${method.fullName} as originalDefault};`};
  await verifyTypedTargets(exported,(_api,_result,module)=>{assert.deepEqual(module.originalDefault(),{$:'EmergencyAuthConfig',enabled:false,allow_non_loopback:false,duration_minutes:60n});assert.notStrictEqual(module.originalDefault(),module.originalDefault());},{childTimeoutMs:20000});
});
test('both actual Emergency siblings close complete Default name effects without collection behavior',{timeout:60000},()=>{
  const file='src/emergency_auth.rs',source=readFileSync(new URL(file,root),'utf8'),args=setup(source,'EmergencyAuth',file),bang=createDeriveBangContext({deriveContext:args.context});
  const selected=bang.certificates.filter(row=>['EmergencyAuth','EmergencyAuthStatus'].some(name=>args.context.certificates.find(input=>input.digest===row.inputCertificateDigest)?.name===name));
  retain('02-complete-emergency-owner-set',{source,context:args.context,bang});assert.equal(selected.length,2);
  for(const row of selected){assert.deepEqual(row.residualOwners,[]);assert.equal(row.dimensions.bangMacroComplete,true);assert.equal(row.generatedImplBehavior,false);}
  for(const name of ['EmergencyAuth','EmergencyAuthStatus']){
    const joined=prove(source,name,file),field=joined.route.typedSource.fields.find(row=>row.typeSource.includes("BTreeMap<&'static str, u64>"));assert.ok(field,name);assert.deepEqual(staticTokens(field.type.syntax),["'static"]);noBehavior(joined);
    retain('02-private-default-'+name,{source,joined});assert.equal(joined.output.kind,'ItemKind::Impl');assert.equal(joined.output.items.length,1);assert.equal(joined.output.items[0].name,'default');
  }
});
test('static shared references within nested type paths preserve exact source and canonical syntax',{timeout:60000},()=>{
  for(const type of ["&'static str","BTreeMap<&'static str,u64>","Mutex<BTreeMap<&'static str,u64>>","Vec<Option<&'static str>>","outer::Map<&'static ::core::primitive::str,Vec<u64>>"]){
    const source='#[derive(Default)]pub struct Record{value:'+type+'}',joined=prove(source),field=joined.route.typedSource.fields[0];retain('03-'+Buffer.from(type).toString('hex'),{source,joined});
    assert.equal(field.typeSource,type);assert.equal(source.slice(field.typeSpan.start,field.typeSpan.end),type);assert.equal(field.type.semanticSyntaxRoundTrip,true);assert.deepEqual(staticTokens(field.type.syntax),["'static"]);assert.equal(field.type.syntaxSha256,sha(JSON.stringify(field.type.syntax)));assert.equal(validateBuiltinDefaultAstOutput(joined.route,structuredClone(joined.output)),true);noBehavior(joined);
  }
});
test('ordinary path-only Default input and output remain admitted alongside reference syntax',{timeout:60000},()=>{
  for(const type of ['String','Vec<Option<String>>','other::Record']){
    const source='#[derive(Default)]pub struct Record{value:'+type+'}',joined=prove(source);retain('04-'+Buffer.from(type).toString('hex'),{source,joined});noBehavior(joined);assert.deepEqual(staticTokens(joined.route.typedSource.fields[0].type.syntax),[]);assert.equal(joined.output.items[0].body.statements[0].expr.slots.fields[0].expr.slots.args.length,0);
  }
});
test('genuine pinned visitor Ref and lifetime helper edges retain complete source lineage',{timeout:60000},()=>{
  const source="#[derive(Default)]pub struct Record{value:BTreeMap<&'static str,u64>}",joined=prove(source),plan=builtinDefaultOriginalSourcePlan(joined.route),inventory=plan.visitor.inventory;
  const selected=Object.fromEntries(['walk_ty','visit_lifetime','walk_lifetime'].map(name=>{const row=plan.visitor.recipes.find(row=>row.name===name);assert.ok(row,name);assert.equal(row.sourceSha256,'2cde31625ec47f907d6a314ae06e75711245ca79f8dc1f5bf5b44768c6dc87fd');assert.equal(row.semanticSyntaxRoundTrip,true);return [name,builtinVisitorFunctionText(inventory,row)];}));
  retain('05-full-visitor-source-and-plan',{source,joined,selected,visitor:builtinAstOriginal(profile,'compiler/rustc_ast/src/visit.rs'),helpers:builtinAstOriginal(profile,'compiler/rustc_ast_ir/src/visit.rs')});
  assert.ok(selected.walk_ty.includes('TyKind :: Ref'));assert.ok(selected.visit_lifetime.includes('walk_lifetime'));assert.ok(selected.walk_lifetime.includes('visit_ident'));assert.ok(plan.visitor.helperOutputs.some(row=>row.call.functionDigest===plan.visitor.recipes.find(row=>row.name==='walk_lifetime').digest&&row.call.name==='try_visit'));assert.equal(plan.visitor.arbitraryVisitorExecution,false);noBehavior(joined);
});
test('unproved lifetimes mutable references macros and executable field syntax remain refused',{timeout:60000},()=>{
  const types=["&str","&'named str","&'static mut str","BTreeMap<&'named str,u64>","BTreeMap<&'static mut str,u64>","&'static unknown!()","Vec<&'static unknown!()>","[&'static str;3]","(&'static str,u64)","fn()->&'static str","&'static &'static str"];
  const rows=[];for(const type of types){const source='#[derive(Default)]pub struct Record{value:'+type+'}';let error;try{prove(source);}catch(value){error={name:value.name,message:value.message};}rows.push({source,error});assert.ok(error,type);}retain('06-complete-refusals',rows);
});
test('copied routes changed source and mirrored output nodes cannot forge a static-reference proof',{timeout:60000},()=>{
  const source="#[derive(Default)]pub struct Record{value:BTreeMap<&'static str,u64>}",args=setup(source),joined=originalBuiltinDefaultBangOutput(args),output=structuredClone(joined.output);
  assert.throws(()=>originalBuiltinDefaultAstOutput(structuredClone(joined.route)),/genuine|Unsealed/);assert.throws(()=>validateBuiltinDefaultAstOutput(structuredClone(joined.route),output),/genuine/);
  assert.throws(()=>assertBuiltinDeriveBangFootprint(structuredClone(joined.proof),args.context,args.certificate,args.invocation));
  const other=setup(source.replace("&'static str","&'static u8"));assert.throws(()=>assertBuiltinDeriveBangFootprint(joined.proof,other.context,other.certificate,other.invocation));
  output.items[0].body.statements[0].expr.slots.fields[0].expr.slots.args.push({kind:'ExprKind::MacCall',source:'forged!()'});retain('07-original-and-mutated-output',{source,joined,output});assert.throws(()=>validateBuiltinDefaultAstOutput(joined.route,output),/positive output/);
});
test('new namespace closure enables independent checked functions without admitting BTreeMap Default runtime',{timeout:60000},async()=>{
  const source="#[derive(Default)]pub struct Record{value:BTreeMap<&'static str,u64>}pub fn accepted(value:Option<u8>)->bool{matches!(value,Some(n) if n>2)}pub fn bad()->Record{Record::default()}",result=compile(source);
  retain('08-complete-independent-runtime',{source,result});assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedTypeScope,false);assert.ok(result.meta.executable.some(row=>row.name==='accepted'));assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);assert.ok(result.meta.refused.some(row=>row.name==='bad'));assert.equal((result.meta.checkedGeneratedMethods??[]).some(row=>row.name==='Record.default'),false);
  const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
  await verifyTypedTargets(result,api=>{assert.equal(api.accepted(Object.freeze({$:'None'})),false);for(const [n,want]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.accepted(Object.freeze({$:'Some',field0:n})),want);},{childTimeoutMs:20000});
});
