import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {SLICE_MEMBERSHIP_PROFILE,borrowedStringSliceReceiver,planBorrowedStringSliceContains} from '../extensions/slice-membership.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const hash=value=>createHash('sha256').update(value).digest('hex');
const str=()=>({kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'}});
const shared=type=>({...type,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(type),span:{start:0,end:4},tokens:[{value:'&',span:{start:0,end:1}}]}});
const slice=()=>shared({kind:'array',rustSourceType:true,element:str(),rustOwnership:{kind:'borrowed',source:'slice'}});
const needle=()=>({k:'var',name:'needle',type:str(),span:{start:0,end:6}});
const borrow=()=>({k:'routerTextReference',sourceBorrowToken:{value:'&',span:{start:0,end:1}},span:{start:0,end:7}});

test('source profile verifies exact pinned sources and distinguishes array owners and actual shared needles',()=>{
  assert.equal(SLICE_MEMBERSHIP_PROFILE.rust,'1.89.0');assert.equal(SLICE_MEMBERSHIP_PROFILE.sourceInputsVerified,true);
  for(const name of ['namespaceAuthority','runtimeParity','generatedTraitBehavior','rustExecution'])assert.equal(SLICE_MEMBERSHIP_PROFILE[name],false);
  for(const source of SLICE_MEMBERSHIP_PROFILE.sources)assert.equal(hash(readFileSync(new URL('../source-profiles/slice-membership/'+source.file,import.meta.url))),source.compressedSha256);
  const receiver={type:slice()},plan=planBorrowedStringSliceContains(receiver,needle(),borrow(),{start:0,end:7});
  assert.equal(plan.receiver.kind,'slice');assert.equal(plan.constEligible,false);assert.equal(plan.argument.kind,'explicit-shared-borrow');
  assert.equal(planBorrowedStringSliceContains(receiver,{...needle(),type:shared(str())},{k:'name'},{start:0,end:6}).argument.kind,'existing-shared-reference');
  const fixed={kind:'array',element:str(),rustSourceType:true,rustOwnership:{kind:'value',source:'array'},rustFixedArray:{length:2}};
  assert.deepEqual(borrowedStringSliceReceiver(fixed,{start:0,end:1}),{kind:'fixed-array',length:2,sharedReceiver:false});
  const scope={source:'src/lib.rs',module:[],bindings:[{name:'member',namespace:'value',kind:'fn',status:'resolved'}],unresolvedTypeScope:false,unresolvedAttributeMacroScope:false};
  assert.equal(planBorrowedStringSliceContains({type:fixed},needle(),borrow(),{start:0,end:7},scope).receiver.kind,'fixed-array');
  const vec={kind:'array',element:str(),rustSourceType:true,rustOwnership:{kind:'owned',source:'Vec'},patternOwnershipRefusal:'ownership-bearing Vec type'};
  assert.equal(borrowedStringSliceReceiver(vec,{start:0,end:1}).kind,'Vec');
  for(const blocked of [{...vec,rustSourceType:false},{...vec,patternOwnershipRefusal:'custom Vec obligation'},{...vec,patternOwnershipRefusal:'ownership-bearing String type'},{...vec,rustOwnership:{kind:'borrowed',source:'Vec'}},{...vec,rustGenericIdentityUnresolved:true},{...vec,element:{...str(),rustOwnership:{kind:'owned',source:'String'}}}])assert.throws(()=>borrowedStringSliceReceiver(blocked,{start:0,end:1}));
  for(const blocked of [undefined,{...scope,unresolvedTypeScope:true},{...scope,unresolvedAttributeMacroScope:true},{...scope,bindings:[{namespace:'type',kind:'trait',name:'CustomContains'}]},{...scope,bindings:[{namespace:'macro',kind:'textual-macro',name:'expand'}]}])assert.throws(()=>planBorrowedStringSliceContains({type:fixed},needle(),borrow(),{start:0,end:7},blocked));
  for(const type of [{kind:'array',element:str()}, {...fixed,element:{kind:'string'}},{...fixed,element:{...str(),rustOwnership:{kind:'owned',source:'String'}}},{...fixed,rustGenericIdentityUnresolved:true},shared(fixed),shared(shared(fixed)),{...fixed,rustFixedArray:undefined}])assert.throws(()=>borrowedStringSliceReceiver(type,{start:0,end:1}));
  for(const arg of [{...needle(),type:{kind:'string'}},{...needle(),type:{...str(),rustOwnership:{kind:'owned',source:'String'}}},{...needle(),type:{...str(),rustBorrowingUnresolved:'invented borrow'}},{...needle(),type:shared(str())}])assert.throws(()=>planBorrowedStringSliceContains(receiver,arg,borrow(),{start:0,end:7}));
  assert.throws(()=>planBorrowedStringSliceContains(receiver,needle(),{...borrow(),sourceBorrowToken:{value:'&',span:{start:1,end:2}}},{start:0,end:7}));
});

test('actual slice Vec fixed-array and shared-needle membership executes both targets without substring coercion',async()=>{
  const source='pub fn slice(v:&[&str],n:&str)->bool{v.contains(&n)} pub fn owned_vec(v:Vec<&str>,n:&str)->bool{v.contains(&n)} pub fn borrowed_vec(v:&Vec<&str>,n:&str)->bool{v.contains(&n)} pub fn fixed(v:[&str;2],n:&str)->bool{v.contains(&n)} pub fn shared_needle(v:&[&str],n:&&str)->bool{v.contains(n)} pub fn temporary(v:&[&str],n:&str)->bool{v.contains(&n.to_ascii_lowercase().as_str())} pub fn substring(v:&str,n:&str)->bool{v.contains(n)}';
  const result=project(source);
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  const scope=result.sourceScopes.find(entry=>entry.scope.file==='src/lib.rs').scope;
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const memberships=[];
  const collect=value=>{if(!value||typeof value!=='object')return;if(value.k==='routerSliceContains')memberships.push(value);for(const [key,child]of Object.entries(value))if(!['type','membershipProof'].includes(key))Array.isArray(child)?child.forEach(collect):collect(child);};
  for(const entry of checked.declarations.values())if(entry.k==='fn')collect(entry.body);
  const adjusted=memberships.filter(value=>value.membershipProof.receiver.kind!=='slice');assert.equal(adjusted.length,3);
  for(const {membershipProof:{sourceMethodScope}}of adjusted){
    assert.equal(sourceMethodScope.source,'src/lib.rs');assert.deepEqual(sourceMethodScope.module,scope.path);
    assert.equal(sourceMethodScope.unresolvedTypeScope,false);assert.equal(sourceMethodScope.unresolvedAttributeMacroScope,false);
    assert.deepEqual(sourceMethodScope.bindings.map(binding=>[binding.name,binding.namespace,binding.kind,binding.status,binding.target]),scope.bindings.map(binding=>[binding.name,binding.namespace,binding.kind,binding.status,binding.target]));
    assert.ok(sourceMethodScope.bindings.every(binding=>binding.namespace==='value'&&binding.kind==='fn'&&binding.status==='resolved'));
    for(const binding of sourceMethodScope.bindings)assert.match(source.slice(binding.sourceSpan.start,binding.sourceSpan.end),new RegExp('pub fn '+binding.name+'\\('));
  }
  await verifyTypedTargets(result,api=>{
    for(const name of ['slice','owned_vec','borrowed_vec','fixed','shared_needle']){
      assert.equal(api[name](Object.freeze(['é','🦀']),'🦀'),true);assert.equal(api[name](Object.freeze(['é','🦀']),'é'),false);
      assert.equal(api[name](Object.freeze(['ab','b']),'a'),false);assert.throws(()=>api[name](Object.freeze(['é','🦀']),null),TypeError);
    }
    assert.equal(api.slice(Object.freeze([]),'x'),false);assert.equal(api.temporary(Object.freeze(['host','authorization']),'HOST'),true);
    assert.equal(api.substring('prefix-middle-suffix','middle'),true);
    let reads=0;const getter=['x'];Object.defineProperty(getter,'0',{get(){reads++;throw new Error('getter must not run');}});
    const proxy=new Proxy(['x'],{get(){reads++;throw new Error('proxy must not run');},getPrototypeOf(){reads++;throw new Error('proxy must not run');}});
    for(const name of ['slice','owned_vec','borrowed_vec','fixed','shared_needle'])for(const value of [getter,proxy])assert.throws(()=>api[name](value,'x'),TypeError);
    assert.equal(reads,0);
  });
});

test('slice inherent membership wins over a same-candidate by-value trait method',async()=>{
  const source='trait PretendContains{fn contains(self,n:&&str)->bool;} impl PretendContains for &[&str]{fn contains(self,n:&&str)->bool{false}} pub fn inherent(v:&[&str],n:&str)->bool{v.contains(&n)}';
  const result=project(source);
  assert.ok(result.meta.executable.some(entry=>entry.name==='inherent'&&entry.term==='fn'));
  assert.ok(result.meta.refused.length,'the fixture trait body is not promoted to a standard implementation');
  assert.equal(result.meta.runtimeParity,false);
  const scope=result.sourceScopes.find(entry=>entry.scope.file==='src/lib.rs').scope;
  assert.ok(scope.bindings.some(binding=>binding.namespace==='type'&&binding.kind==='trait'&&binding.name==='PretendContains'));
  await verifyTypedTargets(result,api=>{
    assert.equal(api.inherent(Object.freeze(['present']),'present'),true,'slice inherent contains must win over the visible false-returning trait');
    assert.equal(api.inherent(Object.freeze(['present']),'absent'),false);
    assert.equal(api.inherent(Object.freeze([]),'present'),false);
  });
});

test('receiver and needle source calls execute once in written order',async()=>{
  const result=project('pub fn receiver()->[&\'static str;2]{["left","right"]} pub fn needle()->&\'static str{"right"} pub fn ordered()->bool{receiver().contains(&needle())}');assert.deepEqual(result.meta.refused,[]);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const emitted=name=>target.declarations.get('rp_'+Buffer.from(name).toString('hex')).name;
  const instrument=(text,typed)=>{
    for(const name of ['receiver','needle']){const prefix='function '+emitted(name)+'(';assert.equal(text.split(prefix).length,2);const at=text.indexOf(' {\n',text.indexOf(prefix))+1;assert.ok(at>0,'actual emitted function body delimiter must be present');text=text.slice(0,at+1)+`ml_fixture_membership_events.push('${name}');`+text.slice(at+1);}
    return text+`\nconst ml_fixture_membership_events${typed?': string[]':''}=[];export function fixtureMembershipOrder(){ml_fixture_membership_events.length=0;return {value:${emitted('ordered')}(),events:ml_fixture_membership_events.join(',')};}`;
  };
  await verifyTypedTargets({...result,javascript:instrument(result.javascript,false),typescript:instrument(result.typescript,true)},(_api,_result,module)=>assert.deepEqual(module.fixtureMembershipOrder(),{value:true,events:'receiver,needle'}));
});

test('owned elements arbitrary references custom methods const effects and escaping temporary borrows remain refused',()=>{
  const prerequisite=JSON.parse(readFileSync(new URL('../fixtures/slice-membership-prerequisites.json',import.meta.url),'utf8'));
  assert.equal(hash(prerequisite.source),prerequisite.sourceSha256);
  const {start,end}=prerequisite.initialRefusal.span;
  assert.equal(hash(prerequisite.source.slice(start,end)),prerequisite.bodySha256);
  const retained=project(prerequisite.source);
  assert.deepEqual(retained.meta.refused.filter(entry=>entry.name==='borrowed_fixed'),[prerequisite.currentRefusal]);
  assert.equal(retained.meta.executable.some(entry=>entry.name==='borrowed_fixed'),false);
  for(const source of [
    'pub fn bad(v:&[String],n:&str)->bool{v.contains(&n)}',
    'pub fn bad(v:&[u8],n:u8)->bool{v.contains(&n)}',
    'pub fn bad(v:&[&str],n:&str)->bool{v.contains(n)}',
    'pub fn bad(v:&&[&str],n:&str)->bool{v.contains(&n)}',
    'pub fn bad(v:&[&str],n:&&&str)->bool{v.contains(n)}',
    'pub fn bad(v:&mut [&str],n:&str)->bool{v.contains(&n)}',
    'pub fn bad(v:&[&str],n:&String)->bool{v.contains(n)}',
    'pub fn bad(v:&[Box<&str>],n:&str)->bool{v.contains(&n)}',
    'struct Vec{value:u8} pub fn bad(v:Vec,n:&str)->bool{v.contains(&n)}',
    'pub const fn bad(v:&[&str],n:&str)->bool{v.contains(&n)}',
    'trait CustomContains{fn contains(&self,n:&&str)->bool;} impl CustomContains for Vec<&str>{fn contains(&self,n:&&str)->bool{false}} pub fn bad(v:Vec<&str>,n:&str)->bool{v.contains(&n)}',
    'trait CustomContains{fn contains(&self,n:&&str)->bool;} impl CustomContains for [&str;2]{fn contains(&self,n:&&str)->bool{false}} pub fn bad(v:[&str;2],n:&str)->bool{v.contains(&n)}',
    'use external::CustomContains; pub fn bad(v:Vec<&str>,n:&str)->bool{v.contains(&n)}',
    'pub fn bad(n:&str)->&\'static str{n.to_ascii_lowercase().as_str()}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);}
});
