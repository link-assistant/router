import test from 'node:test';
import assert from 'node:assert/strict';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {Checker} from '../extensions/core.mjs';
import {parseBindingPattern} from '../pattern-syntax.mjs';
import {planPattern} from '../pattern-bindings.mjs';
const span={start:0,end:0},fixed=(bits=64,signed=false)=>({kind:'fixed',bits,signed}),data=name=>({kind:'data',name});
const declarations=new Checker('Rust',[]).program({language:'Rust',items:[
  {k:'data',name:'Choice',span,ctors:[{name:'A',fields:[{name:'field0',type:fixed()}]},{name:'B',fields:[{name:'field0',type:fixed()}]}]},
  {k:'data',name:'Record',span,ctors:[{name:'Record',fields:[{name:'flag',type:{kind:'bool'}},{name:'choice',type:data('Choice')}]}]},
  {k:'data',name:'Pair',span,tuple:true,ctors:[{name:'Pair',fields:[{name:'field0',type:{kind:'string'}},{name:'field1',type:data('Choice')}]}]},
]}).declarations;
const parse=(source,options={})=>{const cursor=new TokenCursor(tokenizeRust(source),'Rust'),pattern=parseBindingPattern(cursor,options);assert.equal(cursor.atEnd(),true);return pattern;};
const plan=(source,type,options={})=>planPattern(parse(source,options),type,{declarations});
test('nested constructor and record patterns retain complete source spans and checked projection layouts',()=>{
  const source='Record { choice: Choice::A(number), flag: true }',pattern=parse(source),checked=planPattern(pattern,data('Record'),{declarations});
  assert.deepEqual(pattern.span,{start:0,end:source.length});assert.equal(pattern.k,'routerRecordPattern');
  assert.equal(pattern.fields[0].pattern.path.join('::'),'Choice::A');
  assert.deepEqual(checked.bindings.map(binding=>[binding.name,binding.projection]),[['number',['choice','field0']]]);
  assert.equal(checked.refutable,true);
  assert.deepEqual(pattern.fields[1].pattern.span,{start:source.indexOf('true'),end:source.indexOf('true')+4});
  assert.equal(plan('Record { flag, .. }',data('Record')).refutable,false);
});
test('tuple structs, tuples, grouping, unit and wildcard preserve distinct syntax',()=>{
  assert.equal(parse('Pair(label, Choice::B(number),)').k,'ctor');
  const tuple=parse('(label, Choice::B(number),)');assert.equal(tuple.k,'routerTuplePattern');
  assert.deepEqual(planPattern(tuple,data('Pair'),{declarations}).bindings.map(binding=>binding.projection),[['field0'],['field1','field0']]);
  assert.equal(parse('(label)').k,'bindOrCtor');assert.equal(parse('(label,)').k,'routerTuplePattern');
  assert.equal(plan('()', {kind:'unit'}).refutable,false);assert.equal(plan('_',fixed()).bindings.length,0);
  assert.throws(()=>plan('Record(flag, choice)',data('Record')),/named-field layout/);
});
test('qualified Self and imported constructor paths resolve only through the explicit caller callback',()=>{
  const resolvePath=path=>path[0] === 'Self'?['Choice',...path.slice(1)]:path[0] === 'Alias'?['Choice',...path.slice(1)]:path;
  assert.equal(plan('Self::A(number)',data('Choice'),{resolvePath}).bindings[0].name,'number');
  assert.equal(plan('Alias::B(number)',data('Choice'),{resolvePath}).refutable,true);
  assert.deepEqual(parse('crate::models::Value::Null').path,['crate','models','Value','Null']);
  assert.throws(()=>parse('::external::Variant'),/absolute pattern path/);
  assert.equal(parse('unknown').k,'bindOrCtor');assert.equal(parse('None').k,'bindOrCtor');
  assert.throws(()=>parse('Self::A(x)',{resolvePath:()=>null}),TypeError);
});
test('or-patterns are nested structural alternatives with checked equal bindings and exhaustiveness',()=>{
  const checked=plan('| Choice::A(number) | Choice::B(number)',data('Choice'));
  assert.equal(checked.refutable,false);assert.equal(checked.test.kind,'or');assert.equal(checked.bindings[0].name,'number');
  assert.equal(plan('(true | false)',{kind:'bool'}).refutable,false);
  assert.throws(()=>plan('Choice::A(first) | Choice::B(second)',data('Choice')),/same names/);
});
test('literal patterns preserve exact negative integers, suffix obligations, Unicode and raw source spans',()=>{
  assert.equal(plan('-128i8',fixed(8,true)).test.value,'-128');
  assert.equal(plan('18446744073709551615u64',fixed()).test.value,'18446744073709551615');
  assert.throws(()=>plan('1u8',fixed()),/suffix/);assert.throws(()=>plan('256u8',fixed(8)),/outside/);
  const raw='r#"Ω"#',pattern=parse(raw);assert.equal(pattern.value,'Ω');assert.deepEqual(pattern.span,{start:0,end:raw.length});
  assert.equal(plan(raw,{kind:'string'}).test.value,'Ω');
  assert.equal(plan('0xff',fixed(8)).test.value,'255');
  assert.equal(plan('0o_77u8',fixed(8)).test.value,'63');
  assert.equal(plan('0b_10u8',fixed(8)).test.value,'2');
  assert.throws(()=>plan('0x100u8',fixed(8)),/outside/);
  assert.throws(()=>parse('0xff_unknown'),error=>error.kind === 'unsupported');
  assert.throws(()=>parse('-identifier'),error=>error.kind === 'syntax');
});
test('pattern parsing leaves expression delimiters untouched and literal hooks must prove consumption',()=>{
  const cursor=new TokenCursor(tokenizeRust('Record { flag, .. }: Record'),'Rust');
  const pattern=parseBindingPattern(cursor);assert.equal(pattern.fields[0].pattern.k,'bind');assert.equal(cursor.peek().value,':');
  const hook=cursor=>{if(!cursor.is('SPECIAL'))return undefined;const token=cursor.next();return {k:'strLit',value:'checked',span:{start:token.start,end:token.end}};};
  assert.equal(parse('SPECIAL',{parseLiteral:hook}).value,'checked');
  assert.throws(()=>parse('x',{parseLiteral:()=>({k:'strLit',span})}),/must consume/);
  assert.throws(()=>parse('x',{parseLiteral:cursor=>{cursor.next();}}),/unrecognized/);
});
test('reference, mutable, range, slice, positional rest, alias and macro patterns remain explicit source refusals',()=>{
  for(const source of ['&x','&&x','ref x','mut x','box x','[x]','1..=3','x @ Choice::A(n)','() @ x','(x) @ y','Pair(label, ..)','Record { ref flag, .. }','Record { flag, .., choice }','some_macro!()'])assert.throws(()=>parse(source),error=>['unsupported','syntax'].includes(error.kind) && error.span?.start >= 0,source);
  assert.throws(()=>plan('Record { flag, flag, .. }',data('Record')),/duplicate/);
  assert.throws(()=>plan('Record { missing, .. }',data('Record')),/has no field/);
});
