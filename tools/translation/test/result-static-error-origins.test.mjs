import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {emitJavaScript} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const ok=field0=>Object.freeze({$:'Ok',field0}),err=field0=>Object.freeze({$:'Err',field0});

test('genuine Result propagation retains dynamic success and independently static error origins',
  {timeout:60000},async()=>{
    const source=`fn chosen<'a>(value:&'a str,good:bool)->Result<&'a str,&'static str>{
 if good{Ok(value)}else{Err("missing")}
}
pub fn borrowed<'a>(value:&'a str,good:bool)->Result<&'a str,&'static str>{
 let text=chosen(value,good)?;Ok(text)
}
pub fn discard(value:&str,good:bool)->Result<(),&'static str>{
 chosen(value,good)?;Ok(())
}
pub fn two(value:&str,first:bool,second:bool)->Result<(),&'static str>{
 chosen(value,first)?;chosen(value,second)?;Ok(())
}`;
    const result=project(source);
    assert.deepEqual(result.meta.refused,[]);
    const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
    assert.ok(emitJavaScript(program).text.includes('function'));
    await verifyTypedTargets(result,api=>{
      for(const value of ['', 'Ω😀', '\0'])for(const good of [false,true]){
        assert.deepEqual(api.borrowed(value,good),good?ok(value):err('missing'));
        assert.deepEqual(api.discard(value,good),good?ok(null):err('missing'));
        for(const second of [false,true])assert.deepEqual(api.two(value,good,second),
          good&&second?ok(null):err('missing'));
      }
    },{childTimeoutMs:20000});
  });

test('dynamic residual errors and success escapes cannot acquire static origins',()=>{
  for(const source of [
    "fn chosen<'a>(value:&'a str)->Result<u8,&'a str>{Err(value)}pub fn bad(value:&str)->Result<u8,&'static str>{let n=chosen(value)?;Ok(n)}",
    "fn chosen<'a>(value:&'a str)->Result<&'a str,&'static str>{Ok(value)}pub fn bad(value:&str)->Result<&'static str,&'static str>{let n=chosen(value)?;Ok(n)}",
    "pub fn bad<'a>(value:Result<u8,&'a str>)->Result<u8,&'static str>{let n=value?;Ok(n)}",
  ]){
    const result=project(source);
    assert.ok(result.meta.refused.some(row=>row.name==='bad'),source);
    assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
  }
});
