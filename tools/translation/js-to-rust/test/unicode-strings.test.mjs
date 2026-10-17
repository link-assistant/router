import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeJavaScript, translateJavaScript, parseMeta, emitRust, emitTypeScript, TranslationError } from '../translator.mjs';
import { toLino } from '../vendor/ir.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');

async function runtime(ts,directory,name,source,typescript) {
  const original=join(directory,`${name}-original.mjs`),typed=join(directory,`${name}.ts`),target=join(directory,`${name}-target.mjs`);
  writeFileSync(original,source);writeFileSync(typed,typescript);
  const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,typeRoots:[join(ROOT,'packages/javascript/node_modules/@types')],types:['node'],skipLibCheck:true});
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  writeFileSync(target,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return [await import(pathToFileURL(original).href),await import(pathToFileURL(target).href)];
}

test('four original native Unicode observers match authored all-type and boundary goldens',async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-native-unicode-'));
  const coercion={toString(){throw new Error('guarded observers must not coerce');}};
  const nonstrings=[undefined,null,false,1,1n,Symbol(),()=>{},[],new String('id'),new Number(1),coercion];
  const ids=[...nonstrings.map(value=>[value,false]),['',false],['plain-id',true],['slash/id',false],['back\\slash',true],['\0',false],['\u001f',false],['\u007f',false],['\u0085',false],['\u009f',false],['\u00a0',true],['a'.repeat(256),true],['a'.repeat(257),false],['😀'.repeat(64),true],['😀'.repeat(65),false],['é'.repeat(128),true],['é'.repeat(129),false],['中'.repeat(85),true],['中'.repeat(86),false]];
  const fixtures=[
    {path:'affinities.mjs',name:'valid_id',javascript:'validId',cases:ids},
    {path:'response-contracts.mjs',name:'valid_conversation_id',javascript:'validConversationId',cases:ids},
    {path:'affinity-schema.mjs',name:'rust_whitespace',javascript:'rustWhitespace',cases:[...nonstrings.map(value=>[value,false]),['',false],[' ',true],['\t',true],['\u0085',true],['\u00a0',true],['\u2007',true],['\u2028',true],['\u3000',true],['\ufeff',false],['\u180e',false],['\u200b',false],['😀',false],['  ',false],[' \n',false],['\r\n',false]]},
    {path:'usage.mjs',name:'chars',javascript:'chars',cases:[...nonstrings.map(value=>[value,0]),['',0],['abc',3],['😀',1],['a😀b',3],['e\u0301',2],['👨‍👩‍👧‍👦',7],['\r\n',2]]},
  ];
  try {
    for(const fixture of fixtures) {
      const source=readFileSync(join(ROOT,'packages/javascript/native',fixture.path),'utf8'),result=analyzeJavaScript(source),fn=result.program.find(fn=>fn.name===fixture.name);
      assert.equal(fn?.kind,'function');assert.equal(fn.params[0].type,'value');
      const item=result.items.find(item=>item.name===fixture.name&&item.status==='translated'),checked=parseMeta(toLino(fn));
      assert.deepEqual(checked,[fn]);
      const exported=fn.exported?'':`\nexport {${fixture.javascript}};\n`;
      const [original,translated]=await runtime(ts,directory,fixture.name,source.slice(item.start,item.end)+exported,emitTypeScript(checked)+exported);
      for(const [input,expected]of fixture.cases) {
        assert.equal(original[fixture.javascript](input),expected,`JS ${fixture.path}: ${typeof input}`);
        assert.equal(evaluate(checked,fixture.name,[input]),expected,`IR ${fixture.path}: ${typeof input}`);
        assert.equal(translated[fixture.javascript](input),expected,`TS ${fixture.path}: ${typeof input}`);
      }
      if(fixture.name==='rust_whitespace') {
        const model=fn.body[0].value.right;
        assert.equal(model.kind,'class-test');assert.equal(model.unicode,true);assert.equal(model.anchored,true);assert.equal(model.negated,false);
        for(let codepoint=0;codepoint<=0x10ffff;codepoint++) {
          if(codepoint>=0xd800&&codepoint<=0xdfff)continue;
          const input=String.fromCodePoint(codepoint),expected=original.rustWhitespace(input);
          const classified=model.ranges.some(range=>codepoint>=range.low&&codepoint<=range.high);
          if(expected!==classified||translated.rustWhitespace(input)!==expected)assert.fail(`whitespace class mismatch U+${codepoint.toString(16)}`);
        }
      }
      const rust=emitRust(checked);
      if(fixture.name==='chars')assert.match(rust,/\.chars\(\)\.count\(\)/u);
      if(fixture.name.includes('valid')) {assert.match(rust,/js_utf8_length/u);assert.match(rust,/\.chars\(\)\.map/u);}
      if(fixture.name==='rust_whitespace')assert.match(rust,/units\.next\(\)\.is_some_and\(accepted\) && units\.next\(\)\.is_none\(\)/u);
      assert.ok(result.diagnostics.length>0,'neighboring runtime/I/O declarations remain refused');
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('class ASTs distinguish Unicode codepoints, UTF16 units, negation, ranges and whole-input anchors',async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-native-class-regex-'));
  const source=String.raw`/** @param {string} value @returns {boolean} */ export function unicode(value) { return /^[\u{1f600}]$/u.test(value); }
/** @param {string} value @returns {boolean} */ export function utf16(value) { return /^[\ud800-\udbff]$/.test(value); }
/** @param {string} value @returns {boolean} */ export function highUnit(value) { return /[\ud800-\udbff]/.test(value); }
/** @param {string} value @returns {boolean} */ export function pairedEscape(value) { return /^[\uD83D\uDE00]$/u.test(value); }
/** @param {string} value @returns {boolean} */ export function separateEscapes(value) { return /[\u{D83D}\u{DE00}]/u.test(value); }
/** @param {string} value @returns {boolean} */ export function excluded(value) { return /[^a-c]/u.test(value); }
/** @param {string} value @returns {boolean} */ export function empty(value) { return /[]/u.test(value); }
/** @param {string} value @returns {boolean} */ export function any(value) { return /[^]/u.test(value); }
/** @param {string} value @returns {boolean} */ export function singleton(value) { return /^[\t\n\r\v\f\b\x20]$/u.test(value); }`;
  try {
    const result=translateJavaScript(source);assert.deepEqual(parseMeta(result.meta),result.program);
    assert.doesNotMatch(result.meta,/\bsource\b/u);assert.match(result.meta,/\(ranges/u);
    const [original,translated]=await runtime(ts,directory,'classes',source,result.typescript);
    const cases=[
      ['unicode','😀',true],['unicode','a😀',false],['unicode','😀\n',false],
      ['utf16','😀',false],['highUnit','😀',true],['pairedEscape','😀',true],['separateEscapes','😀',false],
      ['excluded','abc',false],['excluded','abc😀',true],['excluded','\n',true],
      ['empty','x',false],['any','',false],['any','😀',true],['any','\n',true],
      ['singleton',' ',true],['singleton','\n',true],['singleton',' \n',false],['singleton','\r\n',false],
    ];
    for(const [name,input,expected]of cases) {
      assert.equal(original[name](input),expected,`source ${name}`);
      assert.equal(translated[name](input),expected,`TS ${name}`);
      const canonical=result.program.find(fn=>fn.name.replace(/_([a-z])/gu,(_,c)=>c.toUpperCase())===name).name;
      assert.equal(evaluate(result.program,canonical,[input]),expected,`IR ${name}`);
    }
    for(const name of ['unicode','utf16','pairedEscape','separateEscapes','excluded','empty','any','singleton']) {
      const canonical=result.program.find(fn=>fn.name.replace(/_([a-z])/gu,(_,c)=>c.toUpperCase())===name).name;
      for(let codepoint=0;codepoint<=0x10ffff;codepoint+=113) {
        if(codepoint>=0xd800&&codepoint<=0xdfff)continue;
        const input=String.fromCodePoint(codepoint),expected=original[name](input);
        assert.equal(evaluate(result.program,canonical,[input]),expected,`IR scalar U+${codepoint.toString(16)}`);
        assert.equal(translated[name](input),expected,`TS scalar U+${codepoint.toString(16)}`);
      }
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('coercive regex/UTF8 calls, stateful/general regex grammar and shadowed Buffer remain refused',()=>{
  for(const source of [
    'export const unsafe=value=>/[a]/u.test(value);',
    'export const unsafe=value=>Buffer.byteLength(value);',
    'export const unsafe=value=>[...value].length;',
    "export const unsafe=value=>typeof value==='string'&&/[a]/g.test(value);",
    "export const unsafe=value=>typeof value==='string'&&/[a]/i.test(value);",
    "export const unsafe=value=>typeof value==='string'&&/[a]+/u.test(value);",
    "export const unsafe=value=>typeof value==='string'&&/^a$/u.test(value);",
    "export const unsafe=value=>typeof value==='string'&&/[a]/u.exec(value);",
    "export const unsafe=value=>typeof value==='string'&&Buffer.byteLength(value,'hex');",
    "export const unsafe=value=>typeof value==='string'&&[...value,1].length;",
  ])assert.throws(()=>translateJavaScript(source),TranslationError,source);
  const predicate="export const size=value=>typeof value==='string'?Buffer.byteLength(value):0;";
  for(const prefix of ['import Buffer from "custom";','import { other as Buffer } from "custom";','const Buffer={byteLength:()=>1};','Buffer.byteLength=custom;','globalThis.Buffer=custom;'])assert.equal(analyzeJavaScript(prefix+predicate).program.some(fn=>fn.name==='size'),false,prefix);
});
