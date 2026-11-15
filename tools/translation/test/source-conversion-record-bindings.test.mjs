import test from 'node:test';
import assert from 'node:assert/strict';
import {translateSource} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

// The CI SubscriptionUsage failure needs a conversion between existing record
// bindings and a later field. Strict TypeScript independently catches aliases.
const declarations=`pub enum Provider{First,Second}
pub enum State{Unverified}
pub struct Pool{count:u8}
pub struct Usage{provider:Provider,state:State,status:String,pool:Option<Pool>}`;

test('source conversions preserve earlier and later record bindings in both independently checked targets',
  {timeout:60000},async()=>{
    const result=translateSource(declarations+`
pub fn empty_usage(provider:Provider)->Usage{
 Usage{provider,state:State::Unverified,status:"unverified".into(),pool:None}
}
pub fn reversed(provider:Provider)->Usage{
 Usage{pool:None,status:"reversed".into(),state:State::Unverified,provider}
}
pub struct Nested{before:u8,usage:Usage,after:u8}
pub fn nested(provider:Provider)->Nested{
 Nested{before:7,usage:Usage{provider,state:State::Unverified,status:"nested".into(),pool:None},after:9}
}
pub struct Scalar{before:u8,converted:u8,after:u8}
pub fn identity(value:u8)->Scalar{
 Scalar{before:7,converted:value.into(),after:9}
}`,'src/conversion-record-bindings.rs');
    assert.equal(result.ir.counts.carried,0);
    await verifyTypedTargets(result,api=>{
      for(const tag of ['First','Second']){
        const provider=Object.freeze({$:tag});
        const expected=status=>({$:'Usage',provider,state:{$:'Unverified'},status,pool:{$:'None'}});
        assert.deepEqual(api.empty_usage(provider),expected('unverified'));
        assert.deepEqual(api.reversed(provider),expected('reversed'));
        assert.deepEqual(api.nested(provider),{$:'Nested',before:7n,usage:expected('nested'),after:9n});
      }
      for(const value of [0n,1n,255n]){
        assert.deepEqual(api.identity(value),{$:'Scalar',before:7n,converted:value,after:9n});
      }
    },{childTimeoutMs:20000});
  });
