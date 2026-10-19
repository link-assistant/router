import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {parseRust,checkProgram} from '../extensions/data.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';

test('lexical normalization retains the actual const fn tokens and their exact source spans',()=>{
  const source='/* const fn decoy */ const TEXT: &str = r#"const fn inside"#;\npub const fn increment(value: u8) -> u8 { value + 1 } fn main() {}';
  const tokens=tokenizeRust(source),index=tokens.findIndex((token,index)=>token.value==='const' && tokens[index+1]?.value==='fn');
  assert.ok(index>=0);assert.equal(source.slice(tokens[index].start,tokens[index].end),'const');
  assert.equal(source.slice(tokens[index+1].start,tokens[index+1].end),'fn');
  assert.equal(tokens.filter((token,index)=>token.value==='const' && tokens[index+1]?.value==='fn').length,1);
  assert.equal(tokens.some(token=>token.value==='const fn inside'),true);
});
test('direct data frontend marks actual const functions without promoting ordinary pure functions',()=>{
  const source='const VALUE: u8 = 4; const fn checked(value: u8) -> u8 { value + VALUE } fn ordinary(value: u8) -> u8 { value + VALUE } fn main() {}';
  const surface=parseRust(source),checked=checkProgram(surface),constFn=checked.declarations.get('checked');
  assert.equal(surface.items.find(item=>item.name==='checked').constFunction,true);
  assert.equal(constFn.constFunction,true);assert.notEqual(checked.declarations.get('ordinary').constFunction,true);
  assert.notEqual(surface.items.find(item=>item.name==='VALUE').constFunction,true);
  assert.equal(source.slice(constFn.span.start,constFn.span.start+5),'const');
});
test('const qualification remains visible after checked semantic serialization and reparsing',()=>{
  const checked=checkProgram(parseRust('mod nested { pub const fn flag() -> bool { true } } fn main() {}'));
  const text=serializeProgram(checked),reparsed=parseProgram(text);
  assert.equal(serializeProgram(reparsed),text);assert.equal(reparsed.declarations.get('nested.flag').constFunction,true);
  assert.equal(reparsed.declarations.get('nested.flag').body.value,true);
});
