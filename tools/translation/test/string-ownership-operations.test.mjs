import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
test('written standard to_owned creates owned String while as_str keeps the receiver borrow',async()=>{
  const source='pub fn owned(v:&str)->String{v.to_owned()} pub fn reference(v:&String)->String{v.as_str().to_owned()} pub fn view(v:&String)->&str{v.as_str()} pub fn temporary()->String{String::from("Ω").as_str().to_owned()} pub fn trimmed(v:&str)->String{v.trim_end().to_owned()} pub fn trim_display(v:&str)->String{v.trim().to_string()} pub fn display(v:&String)->String{v.to_string()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const program=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  assert.equal(program.declarations.get('owned').body.sourceOwnershipOperation.operation,'to_owned');
  assert.equal(program.declarations.get('view').body.sourceOwnershipOperation.operation,'as_str');
  assert.equal(program.declarations.get('view').body.sourceOwnershipReceiver.type.rustReference.pointee.rustOwnership.source,'String');
  assert.deepEqual(program.declarations.get('view').sourceLifetimeProof.returnOrigins,['input:0:[]']);
  await verifyTypedTargets(result,api=>{
    for(const value of ['','Ω😀','a\r\nb']){assert.equal(api.owned(value),value);assert.equal(api.reference(value),value);assert.equal(api.view(value),value);assert.equal(api.display(value),value);}
    assert.equal(api.temporary(),'Ω');assert.equal(api.trimmed(' Ω\u0085'),' Ω');assert.equal(api.trim_display('\u0085Ω\u0085'),'Ω');assert.equal(api.trim_display('\ufeffΩ\ufeff'),'\ufeffΩ\ufeff');
    assert.throws(()=>api.owned('\ud800'),TypeError);assert.throws(()=>api.reference(1n),TypeError);
  });
});
test('string ownership methods cannot fabricate a borrowed escape or owned return',()=>{
  for(const source of [
    'pub fn bad(v:&str)->&str{v.to_owned()}',
    'pub fn bad(v:String)->&str{v.as_str()}',
    'pub fn bad()->&\'static str{String::from("x").as_str()}',
    'pub fn bad(v:&String)->String{v.as_str()}',
    'pub fn bad(v:&&String)->String{v.to_owned()}',
    'pub fn bad(v:&&String)->String{v.to_string()}',
    'pub fn bad(v:&str)->String{v.to_owned(1)}',
  ]){
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('actual JSON as_str dispatch keeps its standard Option result',async()=>{
  const result=project('pub fn text(v:&serde_json::Value)->Option<&str>{v.as_str()}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.deepEqual(api.text(Object.freeze({$:'String',field0:'Ω'})),Object.freeze({$:'Some',field0:'Ω'}));
    assert.deepEqual(api.text(Object.freeze({$:'Null'})),Object.freeze({$:'None'}));
  });
});
