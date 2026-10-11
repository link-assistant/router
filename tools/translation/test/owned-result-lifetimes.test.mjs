import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {sourceBorrowRegions} from '../extensions/source-lifetimes.mjs';
import {translateSource} from '../translate.mjs';

test('actual owned string results drop copied input lifetime evidence in portable meta',()=>{
  const source='pub fn converted()->String{String::from("static input")} pub fn displayed()->String{"static input".to_string()} pub fn lower()->String{"ABC".to_ascii_lowercase()} pub fn upper()->String{"abc".to_ascii_uppercase()} pub fn literal()->&\'static str{"static input"}';
  const program=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  for(const name of ['converted','displayed','lower','upper']) {
    const entry=program.declarations.get(name);
    assert.deepEqual(entry.body.type.rustOwnership,{kind:'owned',source:'String'});
    assert.equal(entry.body.type.rustBorrowLifetime,undefined,name);
    assert.deepEqual(sourceBorrowRegions(entry.body.type),[],name);
    assert.deepEqual(entry.sourceLifetimeProof.outputs,[],name);
  }
  const literal=program.declarations.get('literal');
  assert.equal(literal.body.type.rustBorrowLifetime.kind,'static');
  assert.deepEqual(literal.sourceLifetimeProof.returnOrigins,['static']);
  for(const original of ['pub fn bad()->&\'static str{String::from("input")}','pub fn bad()->&\'static str{"input".to_string()}']) {
    const translated=translateSource(original);
    assert.equal(translated.ir.items.find(item=>item.name==='bad').status,'carried');
    assert.equal(translated.ir.items.map(item=>item.source).join(''),original);
  }
});
