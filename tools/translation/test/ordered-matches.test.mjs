import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
import {parseProgram} from '../semantic-meta.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
async function both(source,verify){const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyCohortTargets(result,verify);return result;}

test('ordered guards preserve outer captures after failed bindings and check both constructor outcomes',{timeout:30_000},async()=>{
  const result=await both('pub fn choose(v:Option<u8>,n:u8)->u8{match v{Some(n) if n>5=>n,Some(1 | 2) if n==7=>9,Some(_)=>n,None=>0}} pub fn bools(v:bool)->u8{match v{true if false=>1,true=>2,false=>3}} pub fn no_comma(v:Option<u8>)->u8{match v{None=>{0} Some(n) if n>5=>n,Some(_)=>1}}',api=>{
    for(const [v,n,expected]of [[some(8n),7n,8n],[some(1n),7n,9n],[some(1n),4n,4n],[some(3n),7n,7n],[none,7n,0n]])assert.equal(api.choose(v,n),expected);
    assert.equal(api.bools(true),2n);assert.equal(api.bools(false),3n);
    assert.equal(api.no_comma(none),0n);assert.equal(api.no_comma(some(7n)),7n);assert.equal(api.no_comma(some(2n)),1n);
  });
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const evidence=node=>node&&typeof node==='object'&&(node.patternControl?.kind==='ordered-scalar-match'?node.patternControl:Object.entries(node).filter(([key])=>key!=='type').map(([,value])=>Array.isArray(value)?value.map(evidence).find(Boolean):evidence(value)).find(Boolean));
  const proof=evidence(checked.declarations.get('choose').body);assert.equal(proof.expandedRows,5);assert.equal(proof.exhaustiveness,'unguarded-source-patterns-only');assert.equal(proof.rows[0].guarded,true);assert.equal(proof.rows[1].alternatives,2);
});

test('matches evaluates the subject once and retries overlapping alternatives after false guards',{timeout:30_000},async()=>{
  // Calls are observed through an injected registered effect, never by running
  // a Rust oracle or replacing the emitted body. The second guard is true.
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn subject()->Option<u8>{let ignored=mark("subject");Some(1)} pub fn retry()->bool{matches!(subject(),Some(n) | Some(n) if mark("guard"))} pub fn chosen(v:Option<u8>)->u8{match v{Some(n) if mark("guard")=>n,Some(_)=>2,None=>0}}';
  await both(source,(api,{withEffectCapabilities})=>{
    const calls=[];let guards=0;
    const capability={fs:{sync:{readFileSync(path){calls.push(path);if(path==='guard'&&++guards===1)throw Object.assign(Error('missing'),{code:'ENOENT'});return new Uint8Array();}}}};
    assert.equal(withEffectCapabilities(capability,()=>api.retry()),true);assert.deepEqual(calls,['subject','guard','guard']);
    calls.length=0;guards=0;assert.equal(withEffectCapabilities(capability,()=>api.chosen(some(3n))),2n);assert.deepEqual(calls,['guard']);
  });
});

test('matches canonical owners and scalar guard bindings execute checked JS and strict TS',{timeout:30_000},async()=>{
  await both('pub fn accepted(v:Option<u8>)->bool{matches!(v,Some(n) if n>2)} pub fn either(v:Option<&str>)->bool{matches!(v,Some("a" | "b"))} pub fn empty(v:Option<u8>)->bool{matches![v,None,]}',api=>{
    for(const [v,result]of [[none,false],[some(1n),false],[some(3n),true]])assert.equal(api.accepted(v),result);
    assert.equal(api.either(some('a')),true);assert.equal(api.either(some('c')),false);assert.equal(api.either(none),false);assert.equal(api.empty(none),true);
    let reads=0;const proxy=new Proxy(some(3n),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},getPrototypeOf(){reads++;throw Error('prototype');}});
    assert.throws(()=>api.accepted(proxy),TypeError);assert.equal(reads,0);
    assert.throws(()=>api.accepted(Object.freeze({$:'Some',get field0(){reads++;return 3n;}})),TypeError);assert.equal(reads,0);
  });
});

test('guard-only coverage unproved macro owners primitive identities and control remain refused',()=>{
  for(const source of [
    'pub fn bad(v:Option<u8>)->u8{match v{Some(n) if true=>n,None=>0}}',
    'pub fn bad(v:Option<u8>)->u8{match v{Some(n) if n=>n,Some(_)=>1,None=>0}}',
    'pub fn bad(v:Option<u64>)->u8{match v{Some(1usize) if true=>1,Some(_)=>2,None=>0}}',
    'pub fn bad(v:Option<u8>)->u8{match v{Some(n) if {return false;}=>n,Some(_)=>1,None=>0}}',
    'pub fn bad(v:Option<u8>)->u8{match v{Some(n) if true=>return n,Some(_)=>1,None=>0}}',
    'pub fn bad(v:&Option<u8>)->bool{matches!(v,Some(_))}',
    'pub fn bad(v:Option<String>)->bool{matches!(v,Some(text) if text=="x")}',
    'enum Fake{Some(u8),None} pub fn bad(v:Fake)->bool{matches!(v,Option::Some(_))}',
    'macro_rules! matches{($($x:tt)*)=>{true};} pub fn bad(v:u8)->bool{matches!(v,0)}',
    'use external::matches; pub fn bad(v:u8)->bool{matches!(v,0)}',
    'mod other{macro_rules! matches{($($x:tt)*)=>{true};}} pub fn bad(v:u8)->bool{other::matches!(v,0)}',
    'pub const fn bad(v:Option<u8>)->bool{matches!(v,Some(_))}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
});
