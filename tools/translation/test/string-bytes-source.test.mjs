import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {STRING_BYTES_PROFILE,requireStringBytesProof} from '../extensions/string-bytes.mjs';
import {stringBytes} from '../extensions/string-bytes-runtime.mjs';
import {decodeRustByteCharacter,requireByteLiteral} from '../extensions/rust-byte-character.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate) {
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const [key,value]of Object.entries(node))if(!['type','span','patternControl'].includes(key))for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}
  return null;
}

test('actual str Bytes yields exact by-value u8 UTF8 across scalar boundaries in both targets',async()=>{
  const source='pub fn bytes(value:&str)->Vec<u8>{value.bytes().collect()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const fixtures=[['',[]],['\0',[0]],['0A',[48,65]],['é',[195,169]],['Ā',[196,128]],['Ω',[206,169]],['中',[228,184,173]],['😀',[240,159,152,128]],['\u{10ffff}',[244,143,191,191]]];
  await verifyTypedTargets(result,api=>{
    for(const [value,bytes]of fixtures)assert.deepEqual(api.bytes(value),Object.freeze(bytes.map(BigInt)));
    for(const value of ['\ud800','\udfff','A\ud800Z'])assert.throws(()=>api.bytes(value),TypeError);
  });
});

test('UTF8 byte iteration uses original primitive loop state and enum tuple item paths',async()=>{
  const source='pub fn zeros(value:&str)->usize{let mut count:usize=0;for byte in value.bytes(){if byte==b\'0\'{count+=1;}}count}pub fn indexed(value:&str)->usize{let mut count:usize=0;for (index,byte) in value.bytes().enumerate(){if byte==b\'0\'{count+=index;}}count}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.zeros('000'),3n);assert.equal(api.zeros('😀0Ω0'),2n);assert.equal(api.indexed('😀00'),9n);assert.equal(api.indexed(''),0n);});
});

test('byte callbacks retain real shared filter arguments, scalar maps and checked terminal types',async()=>{
  const source='pub fn filtered(value:&str)->usize{value.bytes().filter(|byte|*byte==b\'0\').count()}pub fn shifted(value:&str)->Vec<u8>{value.bytes().map(|byte|byte+1u8).take(2).collect()}pub fn all_zero(value:&str)->bool{value.bytes().all(|byte|byte==b\'0\')}pub fn any_zero(value:&str)->bool{value.bytes().any(|byte|byte==b\'0\')}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.filtered('Ω000'),3n);assert.deepEqual(api.shifted('😀'),[241n,160n]);assert.equal(api.all_zero(''),true);assert.equal(api.all_zero('000'),true);assert.equal(api.all_zero('0Ω'),false);assert.equal(api.any_zero('Ω0'),true);assert.equal(api.any_zero(''),false);});
});

test('lazy byte transforms stop before later arithmetic panics and respect zero take',async()=>{
  const source='pub fn empty(value:&str)->Vec<u8>{value.bytes().map(|byte|byte+255u8).take(0).collect()}pub fn first(value:&str)->bool{value.bytes().all(|byte|if byte==b\'1\'{false}else{20u8/(byte-byte)>0u8})}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.empty('😀later'),[]);assert.equal(api.first('1😀'),false);assert.equal(api.first(''),true);assert.throws(()=>api.first('0'),/division by zero/u);});
});

test('written byte receiver effects occur once while actual callbacks short circuit',async()=>{
  const source='fn text()->&\'static str{let ignored=std::fs::read_to_string("receiver").is_ok();"001"}fn mark(byte:u8)->bool{let ignored=std::fs::read_to_string("callback").is_ok();byte==b\'0\'}pub fn empty()->Vec<u8>{text().bytes().take(0).collect()}pub fn checked()->bool{text().bytes().all(|byte|mark(byte))}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,(api,_result,_module,{effects:{withEffectCapabilities}})=>{
    const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
    assert.deepEqual(withEffectCapabilities(capability,()=>api.empty()),[]);assert.deepEqual(calls,['receiver']);
    calls.length=0;assert.equal(withEffectCapabilities(capability,()=>api.checked()),false);assert.deepEqual(calls,['receiver','callback','callback','callback']);
  });
});

test('actual custom bytes methods use their source owner before standard receiver handling',async()=>{
  const source='struct Counter{n:u8}impl Counter{fn bytes(&self,offset:u8)->u8{self.n+offset}}pub fn custom(n:u8)->u8{Counter{n}.bytes(2u8)}pub fn collision(value:&str)->usize{let ml_string_bytes:u8=7;value.bytes().count()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.custom(5n),7n);assert.equal(api.collision('Ω'),2n);});
  const direct=emitJavaScript(checkProgram(parseRust('fn ml_string_bytes(value:u8)->u8{value}fn count(value:&str)->usize{value.bytes().count()}fn main(){}')));
  assert.match(direct.text,/stringBytes as ml_string_bytes_2/u);
});

test('actual cooked byte literals retain primitive u8 high bytes escapes casts and checked meta',async()=>{
  const source=String.raw`const EDGE:u8=b'\xFF';pub fn high()->u8{b'\xFF'}pub fn escapes()->u8{b'\n'+b'\t'}pub fn wide()->u16{b'\xFF' as u16}pub const fn letter()->u8{b'A'}pub fn edge()->u8{EDGE}pub fn high_byte(value:&str)->bool{value.bytes().any(|byte|byte==b'\x80')}`;
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.high(),255n);assert.equal(api.escapes(),19n);assert.equal(api.wide(),255n);assert.equal(api.letter(),65n);assert.equal(api.edge(),255n);assert.equal(api.high_byte('😀'),true);assert.equal(api.high_byte('A'),false);});
  const node=find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('high').body,node=>node.sourceByteLiteral);
  requireByteLiteral(node,true);assert.equal(node.sourceByteLiteral.raw,String.raw`b'\xFF'`);
  for(const mutate of [node=>{node.value='0';},node=>{node.type.bits=16;},node=>{node.sourceByteLiteral.raw="b'A'";},node=>{node.sourceByteLiteral.span.end++;},node=>{node.sourceByteLiteral.sourceInputs[0].sha256='0'.repeat(64);},node=>{node.sourceByteLiteral.namespaceComplete=true;},node=>{node.sourceByteLiteral.verified=false;}]){const altered=structuredClone(node);mutate(altered);assert.throws(()=>requireByteLiteral(altered,true),/byte character proof/u);}
});

test('byte literal source domains reject Unicode escapes direct nonASCII extra chars suffixes and coercion',()=>{
  const span={start:4,end:11};
  for(const [raw,value]of [[String.raw`b'\x00'`,0],[String.raw`b'\x7f'`,127],[String.raw`b'\x80'`,128],[String.raw`b'\xFF'`,255],[String.raw`b'\0'`,0],[String.raw`b'\n'`,10],[String.raw`b'\r'`,13],[String.raw`b'\t'`,9],[String.raw`b'\\'`,92],[String.raw`b'\''`,39],[String.raw`b'\"'`,34],["b'A'",65]])assert.equal(decodeRustByteCharacter(raw,span).value,String(value));
  for(const raw of ["b'é'","b'😀'",String.raw`b'\u{41}'`,String.raw`b'\xF'`,String.raw`b'\x0g'`,String.raw`b'\q'`,"b'ab'","b''","b'\n'","'A'"])assert.throws(()=>decodeRustByteCharacter(raw,span),/valid single cooked/u);
  for(const source of [String.raw`pub fn bad()->u8{b'A'u8}`,"pub fn bad()->u8{b 'A'}","pub fn bad()->u8{b/*gap*/'A'}","pub fn bad()->u16{b'A'}","pub fn bad(value:u16)->bool{value==b'A'}","pub fn bad()->&u8{&b'A'}"]){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('byte source profile refuses unproved ownership cursor reuse references reverse and const scope',()=>{
  for(const source of [
    'pub fn bad(value:&str)->usize{value.bytes(1u8).count()}',
    'pub fn bad(value:&str)->usize{value.bytes::<u8>().count()}',
    'pub fn bad(value:String)->usize{value.bytes().count()}',
    'pub fn bad(value:&String)->usize{value.bytes().count()}',
    'pub fn bad()->usize{String::from("x").bytes().count()}',
    'pub fn bad(value:&str)->usize{let mut bytes=value.bytes();bytes.count()}',
    'pub fn bad(value:&str)->Vec<u8>{value.bytes().copied().collect()}',
    'pub fn bad(value:&str)->Vec<u8>{value.bytes().cloned().collect()}',
    'pub fn bad(value:&str)->Vec<u8>{value.bytes().rev().collect()}',
    'pub fn bad(value:&str)->Option<u8>{value.bytes().next()}',
    'pub fn bad(value:&str)->Vec<u16>{value.bytes().collect()}',
    'pub const fn bad(value:&str)->usize{value.bytes().count()}',
    'enum Vec{Other}pub fn bad(value:&str)->Vec{value.bytes().collect()}',
    'type u8=bool;pub fn bad(value:&str)->Vec<u8>{value.bytes().collect()}',
  ]){const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('full pinned byte sources and checked meta retain exact primitive and receiver proofs',()=>{
  const root=new URL('../source-profiles/string-bytes/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  for(const input of manifest.sources){const encoded=readFileSync(new URL(input.file,root)),raw=gunzipSync(encoded);assert.equal(raw.length,input.bytes);assert.equal(createHash('sha256').update(encoded).digest('hex'),input.compressedSha256);assert.equal(createHash('sha256').update(raw).digest('hex'),input.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),input.gitBlobSha);}
  const source='pub fn count(value:&str)->usize{value.bytes().count()}',result=project(source);assert.deepEqual(result.meta.refused,[]);
  const node=find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('count').body,node=>node.k==='routerStringBytes');requireStringBytesProof(node);
  assert.equal(node.type.element.rustPrimitiveName,'u8');assert.equal(node.stringBytesProof.profile,STRING_BYTES_PROFILE.id);
  for(const mutate of [node=>{node.type.element.rustPrimitiveName='u16';},node=>{node.stringBytesProof.sourceOwner.rustOwnership.kind='owned';},node=>{node.stringBytesProof.span.end++;},node=>{node.stringBytesProof.sourceInputs[0].sha256='0'.repeat(64);},node=>{node.stringBytesProof.namespaceComplete=true;},node=>{node.stringBytesProof.traitComplete=true;},node=>{node.stringBytesProof.constEligible=true;}]){const altered=structuredClone(node);mutate(altered);assert.throws(()=>requireStringBytesProof(altered),/missing actual checked/u);}
  assert.deepEqual([...stringBytes('😀')],[240n,159n,152n,128n]);assert.throws(()=>stringBytes('\ud800'),TypeError);
  const file=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(file.ir.items.map(item=>item.source).join(''),source);assert.equal(file.ir.counts.executableFunctions,1);
});
