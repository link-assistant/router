import test from 'node:test';
import assert from 'node:assert/strict';
import {withOwnershipParser,withOwnershipChecker,assertRustOwnership} from '../extensions/ownership.mjs';
import {HostRustParser,HostChecker,emitJavaScript} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {annotateRuntimeTypes} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const Parser=withOwnershipParser(HostRustParser),Checker=withOwnershipChecker(HostChecker);
const parsed=source=>new Parser(tokenizeRust(source+' fn main(){}')).file();
const checked=source=>new Checker('Rust',[]).program(parsed(source));
const scalar=owner=>({kind:'string',rustOwnership:owner});
const ownedString={kind:'owned',source:'String'},borrowedStr={kind:'borrowed',source:'str'};
const ownedVec={kind:'owned',source:'Vec'},borrowedSlice={kind:'borrowed',source:'slice'};
function targets(source) {
  const program=roundTripProgram(checked(source)),emitted=emitJavaScript(program),functions=[...program.declarations.values()].filter(entry=>entry.k==='fn'&&entry.name!=='main');
  const mapping=name=>emitted.mappings.find(mapping=>mapping.source===name).target;
  const javascript=emitted.text+'\nexport const translated={'+functions.map(entry=>JSON.stringify(entry.name)+':'+mapping(entry.fullName)).join(',')+'};';
  const params=new Map((emitted.signatures??[]).map(entry=>[entry.target,entry.params])),returns=new Map((emitted.signatures??[]).map(entry=>[entry.target,entry.ret]));
  return {program,javascript,typescript:annotateRuntimeTypes(javascript,params,[...program.declarations.values()].filter(entry=>entry.k==='data'),returns)};
}

test('ownership categories require actual source evidence rather than portable scalar equality',()=>{
  const span={start:5,end:12},array=(owner,element)=>({kind:'array',element,rustOwnership:owner}),generic=argument=>({kind:'data',name:'same-portable-name',rustStandardGeneric:{kind:'Option',arguments:[argument]}});
  for(const [actual,expected]of [[scalar(ownedString),scalar(borrowedStr)],[scalar(borrowedStr),scalar(ownedString)],[{kind:'string'},scalar(ownedString)],[array(ownedVec,scalar(ownedString)),array(borrowedSlice,scalar(ownedString))],[generic(scalar(ownedString)),generic(scalar(borrowedStr))],[array(ownedVec,scalar(ownedString)),array(ownedVec,scalar(borrowedStr))]])assert.throws(()=>assertRustOwnership(actual,expected,span),error=>error.kind==='type'&&error.span.start===5);
  for(const owner of [ownedString,borrowedStr])assert.doesNotThrow(()=>assertRustOwnership(scalar(owner),scalar(owner),span));
  assert.doesNotThrow(()=>assertRustOwnership(scalar(ownedString),{kind:'string'},span));
  for(const type of [{kind:'fixed',bits:8,signed:false,rustGenericIdentityUnresolved:true},array(borrowedSlice,{kind:'fixed',bits:8,signed:false,rustGenericIdentityUnresolved:true})])assert.throws(()=>assertRustOwnership(type,type,span),error=>error.kind==='unsupported');
});

test('actual written type qualifiers survive checked signatures and semantic IR',()=>{
  const program=roundTripProgram(checked('pub fn owned(v:String)->String{v} pub fn borrowed(v:&str)->&str{v} pub fn vector(v:Vec<u8>)->Vec<u8>{v} pub fn slice(v:&[u8])->&[u8]{v}'));
  for(const [name,owner]of [['owned',ownedString],['borrowed',borrowedStr],['vector',ownedVec],['slice',borrowedSlice]]) {
    const entry=program.declarations.get(name);assert.deepEqual(entry.params[0].type.rustOwnership,owner);assert.deepEqual(entry.ret.rustOwnership,owner);assert.deepEqual(entry.body.type.rustOwnership,owner);
  }
  assert.throws(()=>checked('fn bad(v:[u8])->u8{0}'),/unsized slice value/);
  assert.throws(()=>checked('fn bad(v:String)->String{&&v}'),/repeated shared ownership borrow/);
});

test('borrow lifetime metadata preserves only actual written syntax and original literal origins',()=>{
  const source='pub fn elided(v:&str)->&str{v} pub fn explicit(v:&\'static str)->&\'static str{v} pub fn literal()->&\'static str{"Ω"}';
  const program=roundTripProgram(checked(source));
  for(const [name,kind,syntax]of [['elided','elided','&str'],['explicit','static',"&'static str"]]){
    const type=program.declarations.get(name).params[0].type,proof=type.rustBorrowLifetime;
    assert.equal(proof.kind,kind);assert.equal(proof.source,'borrowed-str-type');assert.equal(source.slice(proof.span.start,proof.span.end),syntax);
    assert.equal(proof.tokens[0].value,'&');assert.equal(proof.tokens.at(-1).value,'str');
  }
  const proof=program.declarations.get('literal').body.type.rustBorrowLifetime;
  assert.equal(proof.kind,'static');assert.equal(proof.source,'string-literal');assert.equal(source.slice(proof.span.start,proof.span.end),'"Ω"');
  const checker=new Checker('Rust',[]),generated=checker.qualifyOwnershipResult({k:'lit',value:'generated',span:{start:0,end:0}},{k:'lit',value:'generated',type:{kind:'string'}});
  assert.equal(generated.type.rustBorrowLifetime,undefined);
  const nested=parsed('fn nested(v:&&str)->&&str{v}').items[0].params[0].type;
  assert.equal(nested.rustBorrowLifetime,undefined);assert.equal(nested.rustReference.pointee.rustBorrowLifetime.kind,'elided');
});

test('shared ownership proof requires actual pointees and bounded reference depth equality',()=>{
  const span={start:0,end:1},leaf={...scalar(ownedString),rustSourceType:true};
  const reference=pointee=>({...leaf,rustReference:{kind:'shared',pointee}});
  assert.throws(()=>assertRustOwnership({...leaf,rustSourceType:'inferred'},leaf,span),error=>error.kind==='unsupported');
  for(const reference of [{kind:'shared'},{kind:'mutable',pointee:leaf}])assert.throws(()=>assertRustOwnership({...leaf,rustReference:reference},{...leaf,rustReference:reference},span),error=>error.kind==='unsupported');
  let deep=leaf;for(let level=0;level<32;level++)deep=reference(deep);
  assert.doesNotThrow(()=>assertRustOwnership(deep,structuredClone(deep),span));
  assert.throws(()=>assertRustOwnership(deep,deep.rustReference.pointee,span),/reference depth differs/);
  for(const source of ['fn bad(v:&String)->String{v}','fn bad(v:&Vec<u8>)->Vec<u8>{v}','fn bad(v:&&String)->&String{v}'])assert.throws(()=>checked(source),/reference depth differs|distinct Rust owned and borrowed/,source);
});

test('qualifiers do not reinterpret arbitrary written method names as builtin ownership conversions',()=>{
  const checker=new Checker('Rust',[]),value={k:'app',type:scalar(ownedString)};
  for(const op of ['trim','to_uppercase','to_ascii_uppercase'])assert.deepEqual(checker.qualifyOwnershipResult({k:'routerStringOperation',op},value).type,value.type);
});

test('valid owned String operations and scalar borrows execute without invented ownership conversions',async()=>{
  const result=targets('pub fn owned(v:String)->String{v} pub fn borrowed(v:&str)->&str{v} pub fn length(v:String)->usize{v.len()} pub fn contains(v:String)->bool{v.contains("Ω")} pub fn trimmed_length(v:String)->usize{v.trim().len()} pub fn make(v:&str)->String{v.to_string()} pub fn replace(v:&str)->String{v.replace("x","Ω")} pub fn formatted(v:u8)->String{format!("n={v}")} pub fn from(v:&str)->String{String::from(v)} pub fn empty()->String{String::new()} pub fn upper(v:&str)->String{v.to_uppercase()} pub fn ascii(v:&str)->String{v.to_ascii_uppercase()}');
  await verifyTypedTargets(result,api=>{
    assert.equal(api.owned('Ω'),'Ω');assert.equal(api.borrowed('Ω'),'Ω');assert.equal(api.length('😀Ω'),6n);
    assert.equal(api.contains('AΩ'),true);assert.equal(api.contains('A'),false);assert.equal(api.trimmed_length(' Ω '),2n);
    assert.equal(api.make('Ω'),'Ω');assert.equal(api.replace('xx'),'ΩΩ');assert.equal(api.formatted(8n),'n=8');assert.equal(api.from('Ω'),'Ω');
    assert.equal(api.empty(),'');assert.equal(api.upper('straße'),'STRASSE');assert.equal(api.ascii('aΩ'),'AΩ');
    assert.throws(()=>api.owned(new String('Ω')),TypeError);assert.throws(()=>api.length(1n),TypeError);
  });
});

test('Vec and slice identity remains explicit through unchanged source functions',async()=>{
  const result=targets('pub fn vector(v:Vec<u8>)->Vec<u8>{v} pub fn slice(v:&[u8])->&[u8]{v} pub fn shared_vector(v:&Vec<u8>)->&Vec<u8>{v} pub fn shared_string(v:&String)->&String{v} pub fn make()->Vec<u8>{vec![1,2]} pub fn empty()->Vec<u8>{Vec::new()}');
  await verifyTypedTargets(result,api=>{const value=Object.freeze([1n,2n]);assert.strictEqual(api.vector(value),value);assert.strictEqual(api.slice(value),value);assert.strictEqual(api.shared_vector(value),value);assert.equal(api.shared_string('Ω'),'Ω');assert.deepEqual(api.make(),[1n,2n]);assert.deepEqual(api.empty(),[]);assert.throws(()=>api.vector([256n]),TypeError);});
});

test('per-use standard generic source ownership refuses erased String substitutions in both declaration orders',()=>{
  const first='fn owned(v:Option<String>)->Option<String>{v}',bad='fn bad(v:Option<&str>)->Option<String>{v}';
  for(const source of [first+bad,bad+first])assert.throws(()=>checked(source),/distinct Rust owned and borrowed source types/);
  for(const source of [
    'fn bad(v:Option<String>)->Option<&str>{v}',
    'fn bad(v:Result<String,bool>)->Result<&str,bool>{v}',
    'fn bad(v:Option<Vec<u8>>)->Option<&[u8]>{v}',
    'fn bad(v:Vec<String>)->Vec<&str>{v}',
    'fn bad(v:Box<u8>)->u8{0}',
    'fn bad(v:&[Box<u8>])->u8{0}',
    'struct Container{v:Box<u8>} fn bad(v:Container)->u8{0}',
  ])assert.throws(()=>checked(source),/distinct Rust owned and borrowed|erased Rust ownership generic|Rust source reference depth/,source);
});

test('plain return call and binding boundaries cannot fabricate owned or borrowed source types',()=>{
  for(const source of [
    'fn bad(v:String)->&str{v}',
    'fn bad(v:&str)->String{v}',
    'fn consume(v:&str)->bool{v.is_empty()} fn bad(v:String)->bool{consume(v)}',
    'fn consume(v:String)->bool{v.is_empty()} fn bad(v:&str)->bool{consume(v)}',
    'fn bad(v:String)->usize{let local:&str=v;local.len()}',
    'fn bad(v:Vec<u8>)->&[u8]{v}',
    'fn bad(v:&[u8])->Vec<u8>{v}',
    'fn bad()->String{"literal"}',
    'fn bad()->&str{format!("temporary")}',
    'fn bad(v:String)->&str{v.trim()}',
    'fn bad(v:String)->&String{&v}',
    'fn bad()->&str{String::new()}',
    'fn bad()->&[u8]{Vec::new()}',
    'fn bad()->Vec<u8>{[1,2]}',
  ])assert.throws(()=>checked(source),/distinct Rust owned and borrowed|ownership borrow|escaping owned string borrow|Rust source reference depth|ownership source qualifier is missing/,source);
});
