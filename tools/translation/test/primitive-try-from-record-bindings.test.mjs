import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

test('original numeric bodies preserve enclosing record bindings in independently checked targets',
  {timeout:60000},async()=>{
    const source=`pub struct Converted{before:u8,converted:i64,after:u8}
pub struct Nested{first:u8,inner:Converted,last:u8}
pub fn convert(value:u64)->Converted{
 Converted{before:7,converted:i64::try_from(value).unwrap_or(-3),after:9}
}
pub fn reversed(value:u64)->Converted{
 Converted{after:9,converted:i64::try_from(value).unwrap_or(-3),before:7}
}
pub fn maximum()->Converted{Converted{before:7,converted:i64::MAX,after:9}}
pub fn minimum()->Converted{Converted{before:7,converted:i64::MIN,after:9}}
pub fn nested(value:u64)->Nested{
 Nested{first:5,inner:Converted{before:7,converted:i64::try_from(value).unwrap_or(i64::MIN),after:9},last:11}
}`;
    const root=new URL('../../../',import.meta.url);
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],
      readSource:()=>source,cargoManifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8')});
    assert.deepEqual(result.meta.refused,[]);
    const expected=converted=>({$:'Converted',before:7n,converted,after:9n});
    await verifyTypedTargets(result,api=>{
      const minimum=-9223372036854775808n,maximum=9223372036854775807n;
      for(const value of [0n,1n,maximum,maximum+1n,18446744073709551615n]){
        const inRange=value<=maximum;
        assert.deepEqual(api.convert(value),expected(inRange?value:-3n));
        assert.deepEqual(api.reversed(value),expected(inRange?value:-3n));
        assert.deepEqual(api.nested(value),{$:'Nested',first:5n,
          inner:expected(inRange?value:minimum),last:11n});
      }
      assert.deepEqual(api.maximum(),expected(maximum));
      assert.deepEqual(api.minimum(),expected(minimum));
    },{childTimeoutMs:20000});
  });
