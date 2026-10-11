import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRust,checkProgram} from '../extensions/data.mjs';
import {parseRust as parseHost,checkProgram as checkHost} from '../extensions/host-contracts.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {translateSource} from '../translate.mjs';
import {loadJavaScript} from './artifact-loader.mjs';

test('actual output limiter declaration keeps its Default derive and original field layout',()=>{
  const source=readFileSync(new URL('../../../src/output_limit.rs',import.meta.url),'utf8');
  const item=sourceItems(source).find(item=>item.term==='struct' && item.name==='OutputTokenLimiter');
  assert.ok(item);const text=source.slice(item.start,item.end);
  assert.match(text,/#\[derive\(Clone, Debug, Default\)\]/u);
  const checked=checkHost(parseHost(text+'\nfn main() {}'));
  const entry=checked.declarations.get('OutputTokenLimiter');
  assert.deepEqual(entry.deriveTraits,['Clone','Debug','Default']);
  assert.equal(entry.ctors[0].ctorStyle,'named');
  assert.deepEqual(entry.ctors[0].fields.map(field=>field.name),['remaining','stopped']);
  assert.equal(checked.declarations.get(entry.ctors[0].fields[0].type.name).standardGeneric.kind,'Option');
  assert.deepEqual(entry.ctors[0].fields[1].type,{kind:'bool'});
  assert.equal([...checked.declarations.values()].filter(entry=>entry.k==='fn').length,0);
});

test('unit, empty named, empty tuple and populated tuple constructors retain distinct syntax',()=>{
  const checked=checkProgram(parseRust('struct Unit; struct Named {} struct Tuple(); struct Pair(u8, bool); enum Choice { Unit, Empty(), Value(u8) } fn main() {}'));
  for(const [name,style] of [['Unit','unit'],['Named','named'],['Tuple','tuple'],['Pair','tuple']]) {
    const entry=checked.declarations.get(name);assert.equal(entry.ctors[0].ctorStyle,style);
    assert.notEqual(entry.tuple,true,'a tuple struct is not an anonymous tuple');
  }
  assert.deepEqual(checked.declarations.get('Choice').ctors.map(ctor=>ctor.ctorStyle),['unit','tuple','tuple']);
  assert.deepEqual(checked.declarations.get('Pair').ctors[0].fields.map(field=>field.name),['field0','field1']);
});

test('item, field and variant attributes keep separate source spans and metadata',()=>{
  const source='#[derive(Clone, Copy)] #[allow(dead_code)] struct Record { #[allow(unused)] field: u8 } enum Choice { #[allow(dead_code)] Unit, Tuple(#[allow(unused)] u8) } fn main() {}';
  const surface=parseRust(source),checked=checkProgram(surface),record=checked.declarations.get('Record');
  assert.deepEqual(record.deriveTraits,['Clone','Copy']);
  assert.equal(source.slice(record.rustAttributes[0].span.start,record.rustAttributes[0].span.end),'#[derive(Clone, Copy)]');
  assert.equal(record.rustAttributes[1].name,'allow');
  assert.equal(record.ctors[0].fields[0].rustAttributes.length,1);
  const choice=checked.declarations.get('Choice');assert.deepEqual(choice.deriveTraits,[]);
  assert.equal(choice.ctors[0].rustAttributes.length,1);assert.equal(choice.ctors[1].rustAttributes.length,0);
  assert.equal(choice.ctors[1].fields[0].rustAttributes.length,1);
  assert.deepEqual(record.deriveTraits,surface.items[0].deriveTraits);
});

test('constructor and derive metadata survives canonical checked semantic serialization',()=>{
  const checked=checkProgram(parseRust('#[derive(Debug, Default)] struct Record { value: u8 } #[derive(Clone)] enum Choice { A, B(u8) } fn main() {}'));
  const text=serializeProgram(checked),reparsed=parseProgram(text);
  assert.equal(serializeProgram(reparsed),text);
  assert.deepEqual(reparsed.declarations.get('Record').deriveTraits,['Debug','Default']);
  assert.equal(reparsed.declarations.get('Choice').ctors[1].ctorStyle,'tuple');
});

test('checked field metadata retains ownership syntax that portable type resolution erases',()=>{
  const source='#[derive(Clone, Copy)] struct Plain { value: u8 } struct Owned(Box<u8>); enum Choice { Owned(Box<u16>), Plain(u32) } fn main() {}';
  const checked=checkProgram(parseRust(source));
  assert.deepEqual(checked.declarations.get('Plain').ctors[0].fields[0].rustTypeSyntax,['u8']);
  const owned=checked.declarations.get('Owned').ctors[0].fields[0];
  assert.deepEqual(owned.type,{kind:'fixed',bits:8,signed:false});
  assert.deepEqual(owned.rustTypeSyntax,['Box','<','u8','>']);
  assert.deepEqual(checked.declarations.get('Choice').ctors[0].fields[0].rustTypeSyntax,['Box','<','u16','>']);
  const reparsed=parseProgram(serializeProgram(checked));
  assert.deepEqual(reparsed.declarations.get('Owned').ctors[0].fields[0].rustTypeSyntax,owned.rustTypeSyntax);
});

test('Default layout does not manufacture a default function or other derived trait behavior',async()=>{
  const result=translateSource('#[derive(Default)] pub struct Record { value: u8 } pub fn field(value: Record) -> u8 { value.value } pub fn synthesized() -> Record { Record::default() }');
  assert.equal(result.ir.counts.executableTypes,1);
  const {translated}=await loadJavaScript(result.javascript);
  assert.equal(translated.field(translated.Record(7n)),7n);
  assert.equal(translated.synthesized,undefined);
  assert.equal(result.ir.items.find(item=>item.name==='synthesized').status,'carried');
  assert.match(result.ir.items.find(item=>item.name==='synthesized').diagnostic.message,/default|resolved|unknown/u);
});

test('conditional and procedural data attributes remain explicit source-bearing refusals',()=>{
  for(const source of ['#[cfg(feature="x")] struct Record { value: u8 }','#[cfg_attr(feature="x", derive(Default))] struct Record { value: u8 }','#[derive(Serialize)] struct Record { value: u8 }','#[derive(std::default::Default)] struct Record { value: u8 }','#[repr(C)] struct Record { value: u8 }']) {
    const result=translateSource(source);assert.equal(result.ir.counts.executableTypes,0,source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
    assert.ok(result.ir.items.find(item=>item.term==='struct').diagnostic?.span);
  }
});

test('Default is confined to item data layout and unknown field attributes stay refused',()=>{
  for(const source of ['#[derive(Default)] fn bad() {} fn main() {}','struct Record { #[derive(Default)] value: u8 } fn main() {}','#![derive(Default)] struct Record; fn main() {}','struct Record { #[serde(default)] value: u8 } fn main() {}','enum Choice { #[default] A } fn main() {}'])assert.throws(()=>parseRust(source),error=>error.kind==='unsupported');
});

test('named enum variants and explicit discriminants await separate semantic lowering',()=>{
  for(const source of ['enum Choice { A { value: u8 } } fn main() {}','enum Choice { A = 1 } fn main() {}'])assert.throws(()=>parseRust(source),error=>error.kind==='unsupported');
});
