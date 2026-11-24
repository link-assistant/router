import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

test('original standard methods preserve surrounding record fields and local control boundaries',
  {timeout:60000},async()=>{
    const source=`pub struct Flag{before:u8,value:bool,after:u8}
pub struct Picked{before:u8,value:Option<u8>,after:u8}
pub struct Count{before:u8,value:u8,after:u8}
pub struct Nested{first:u8,flag:Flag,last:u8}
pub fn query(value:Option<u8>)->Flag{
 Flag{before:7,value:value.is_some_and(|v|v>1u8),after:9}
}
pub fn filter(value:Option<u8>)->Picked{
 Picked{before:7,value:value.filter(|v|*v>1u8),after:9}
}
pub fn fallback(value:Option<u8>)->Count{
 Count{before:7,value:value.map_or_else(||13u8,|v|v),after:9}
}
pub fn equal(left:Option<&str>,right:Option<&str>)->Flag{
 Flag{before:7,value:left==right,after:9}
}
pub fn nested(value:Option<u8>)->Nested{
 Nested{first:5,flag:Flag{before:7,value:value.is_some_and(|v|v>1u8),after:9},last:11}
}`;
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
    assert.deepEqual(result.meta.refused,[]);
    const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
    const flag=value=>({$:'Flag',before:7n,value,after:9n});
    await verifyTypedTargets(result,api=>{
      for(const value of [none,some(0n),some(1n),some(2n),some(255n)]){
        const kept=value.$==='Some'&&value.field0>1n;
        assert.deepEqual(api.query(value),flag(kept));
        assert.deepEqual(api.filter(value),{$:'Picked',before:7n,value:kept?value:none,after:9n});
        assert.deepEqual(api.fallback(value),{$:'Count',before:7n,
          value:value.$==='Some'?value.field0:13n,after:9n});
        assert.deepEqual(api.nested(value),{$:'Nested',first:5n,flag:flag(kept),last:11n});
      }
      for(const left of [none,some(''),some('Ω😀')])for(const right of [none,some(''),some('Ω😀')]){
        assert.deepEqual(api.equal(left,right),flag(left.$===right.$&&
          (left.$==='None'||left.field0===right.field0)));
      }
    },{childTimeoutMs:20000});
  });

test('original unwrap bodies preserve record fields around eager lazy and Default specialization',
  {timeout:60000},async()=>{
    const source=`pub struct Count{before:u8,value:u8,after:u8}
pub struct Flag{before:u8,value:bool,after:u8}
pub struct Nested{first:u8,count:Count,last:u8}
pub fn eager(value:Option<u8>)->Count{
 Count{before:7,value:value.unwrap_or(13u8),after:9}
}
pub fn defaulted(value:Option<u8>)->Count{
 Count{before:7,value:value.unwrap_or_default(),after:9}
}
pub fn lazy(value:Option<u8>)->Count{
 Count{before:7,value:value.unwrap_or_else(||13u8),after:9}
}
pub fn flag(value:Option<bool>)->Flag{
 Flag{before:7,value:value.unwrap_or_default(),after:9}
}
pub fn nested(value:Option<u8>)->Nested{
 Nested{first:5,count:Count{before:7,value:value.unwrap_or(13u8),after:9},last:11}
}`;
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
    assert.deepEqual(result.meta.refused,[]);
    const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
    const count=value=>({$:'Count',before:7n,value,after:9n});
    await verifyTypedTargets(result,api=>{
      for(const value of [none,some(0n),some(1n),some(255n)]){
        const selected=value.$==='Some'?value.field0:13n;
        assert.deepEqual(api.eager(value),count(selected));
        assert.deepEqual(api.lazy(value),count(selected));
        assert.deepEqual(api.defaulted(value),count(value.$==='Some'?value.field0:0n));
        assert.deepEqual(api.nested(value),{$:'Nested',first:5n,count:count(selected),last:11n});
      }
      for(const value of [none,some(false),some(true)]){
        assert.deepEqual(api.flag(value),{$:'Flag',before:7n,
          value:value.$==='Some'?value.field0:false,after:9n});
      }
    },{childTimeoutMs:20000});
  });
