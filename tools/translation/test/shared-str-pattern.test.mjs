import {materializeLexicalParentOriginalGit} from './portable-lexical-parent-history.mjs';
import {portableGit} from '../prepare-portable-git-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {translateSource,sha256} from '../translate.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {sharedStrPatternProof,STANDARD_STR_PATTERN_PROFILE} from '../extensions/standard-str-pattern.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const operations=node=>!node||typeof node!=='object'?[]:[...(node.k==='routerTextPattern'?[node]:[]),...Object.entries(node).filter(([key])=>key!=='type').flatMap(([,value])=>Array.isArray(value)?value.flatMap(operations):operations(value))];

test('actual &&str Pattern retains shared pointee evidence in checked meta and both targets',async()=>{
  const source='pub fn contains(v:&str,p:&&str)->bool{v.contains(p)} pub fn prefix(v:&str,p:&&str)->bool{v.starts_with(p)} pub fn replace(v:&str,p:&&str)->String{v.replacen(p,"X",1)} pub fn any(v:&str,p:&[&str])->bool{p.iter().any(|part|v.contains(part))}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  for(const name of ['contains','prefix','replace','any']){
    const [operation]=operations(checked.declarations.get(name).body);assert.equal(operation.patternKind,'shared-borrowed-str');assert.equal(operation.sourcePatternTrait.profile,STANDARD_STR_PATTERN_PROFILE.id);
    assert.equal(operation.sourcePatternTrait.argumentType.rustReference.pointee.rustOwnership.source,'str');assert.equal(operation.args[0].type.rustReference.kind,'shared');
  }
  await verifyTypedTargets(result,api=>{assert.equal(api.contains('😀Ω','Ω'),true);assert.equal(api.contains('e\u0301','é'),false);assert.equal(api.prefix('😀Ω','😀'),true);assert.equal(api.replace('aaaaa','aa'),'Xaaa');assert.equal(api.replace('😀Ω',''), 'X😀Ω');assert.equal(api.any('terminal ready',['missing','ready']),true);assert.equal(api.any('',[]),false);assert.equal(api.any('',['']),true);assert.throws(()=>api.any('ok',['\ud800']),TypeError);});
});

test('shared Pattern admission leaves unsupported reference depths owned arguments and other coercions carried',()=>{
  for(const source of ['pub fn bad(v:&str,p:&&&str)->bool{v.contains(p)}','pub fn bad(v:&str,p:&String)->bool{v.contains(p)}','pub fn bad(v:&str,p:String)->bool{v.contains(p)}','pub fn bad(v:&str,p:&&str)->String{v.replace("x",p)}','pub fn bad(v:&str,p:&&str)->&str{v.trim_matches(p)}','pub const fn bad(v:&str,p:&&str)->bool{v.contains(p)}','pub fn bad(v:&str,p:&&str)->&str{p}','struct Pattern{n:u8} pub fn bad(v:&str,p:&Pattern)->bool{v.contains(p)}']){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
  const leaf={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'}},reference={...leaf,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:leaf}};
  assert.ok(sharedStrPatternProof(reference,{start:0,end:1}));
  for(const type of [{...reference,rustSourceType:false},{...reference,rustGenericIdentityUnresolved:true},{...reference,rustBorrowingUnresolved:true},{...reference,rustReference:{kind:'mutable',pointee:leaf}},{...reference,rustReference:{kind:'shared',pointee:reference}},{...reference,rustReference:{kind:'shared',pointee:{...leaf,rustSourceType:false}}}])assert.equal(sharedStrPatternProof(type,{start:0,end:1}),null);
});

test('unchanged original marker helper recovers using the explicit standard &&str trait implementation',async t=>{
  const historical=materializeLexicalParentOriginalGit(t);
  const path='src/login_pty_backend.rs',original=portableGit(historical.root,['show',historical.revision+':'+path]).toString('utf8');assert.equal(sha256(original),'c808f2dc1cb7c07f2a78c4f4ad4edee6d43fb2f0f37ed4bb0c63a3fc968547e8');
  const item=sourceItems(original).find(item=>item.term==='fn'&&item.name==='contains_marker');assert.deepEqual([item.start,item.end],[3908,4029]);
  const source=original.slice(item.start,item.end);assert.equal(sha256(source),'93810b10b9bc11fe8661c2cb89a3fb7c1564f61c70f646b860f9c3d92f7221c5');
  const result=project(source);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  await verifyTypedTargets(result,api=>{for(const [text,markers,expected] of [['ready',['ready'],true],['ready',['miss','ready'],true],['ready',['miss'],false],['',[],false],['',[''],true],['😀Ω',['Ω'],true],['e\u0301',['é'],false]])assert.equal(api.contains_marker(text,markers),expected);assert.throws(()=>api.contains_marker('ok',['\ud800']),TypeError);});
});
