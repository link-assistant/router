import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { analyzeJavaScript,translateJavaScript,parseMeta,TranslationError } from '../translator.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
async function runtimes(ts,directory,name,source,target) {
  const original=join(directory,`${name}-original.mjs`),typed=join(directory,`${name}.ts`),translated=join(directory,`${name}-target.mjs`);
  writeFileSync(original,source);writeFileSync(typed,target);
  const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  writeFileSync(translated,ts.transpileModule(target,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return [await import(pathToFileURL(original).href),await import(pathToFileURL(translated).href)];
}

test('twelve original private tables admit generic readers and preserve exact source data',{timeout:30000},async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-native-static-tables-'));
  const fixtures=[
    ['accounts.mjs','strategy_aliases','strategyAliases',8,'rr','round-robin'],
    ['accounts.mjs','subscription_kinds','subscriptionKinds',8,'anthropic'],
    ['accounts.mjs','stored_kinds','storedKinds',5,'lefine'],
    ['auth-service.mjs','pending','pending',3,'awaiting_code'],
    ['client-setup.mjs','implemented_clients','implementedClients',4,'qwen'],
    ['emergency-auth.mjs','client_names','clientNames',8,'cursor'],
    ['native-service.mjs','transport','transport',22,'proxy-authenticate'],
    ['native-service.mjs','ingress','ingress',12,'cloudfront-viewer-address'],
    ['native-service.mjs','response_credentials','responseCredentials',7,'set-cookie'],
    ['provider-manifest.mjs','fields','fields',14,'acknowledge_intermediary_risk'],
    ['tokens.mjs','clients','clients',8,'opencode'],
    ['tokens.mjs','client_aliases','clientAliases',5,'gemini-cli','gemini'],
  ];
  try {
    for(const [path,name,binding,size,present,mapped]of fixtures) {
      const source=readFileSync(join(ROOT,'packages/javascript/native',path),'utf8'),analyzed=analyzeJavaScript(source);
      const table=analyzed.program.find(item=>item.name===name);
      assert.equal(table?.kind,'constant',`${path}:${name}`);assert.equal(table.exported,false);
      const item=analyzed.items.find(item=>item.name===name&&item.status==='translated');
      const kernel=`${source.slice(item.start,item.end)}\nexport function has(value){return ${binding}.has(value);} export function size(){return ${binding}.size;} ${mapped===undefined?'':`export function lookup(value){return ${binding}.get(value);}`}`;
      const result=translateJavaScript(kernel);assert.deepEqual(parseMeta(result.meta),result.program);
      const [original,translated]=await runtimes(ts,directory,`${name}-${path}`,kernel,result.typescript);
      const unknown={ [Symbol.toPrimitive](){throw new Error('table reads must not coerce unknown keys');} };
      for(const [input,expected]of [[present,true],['missing-entry',false],[present.toUpperCase(),false],[new String(present),false],[{},false],[unknown,false],[undefined,false],[null,false],[false,false],[1,false],[1n,false],[Symbol(present),false],[()=>{},false]]) {
        assert.equal(original.has(input),expected,`source ${name}`);assert.equal(translated.has(input),expected,`TS ${name}`);assert.equal(evaluate(result.program,'has',[input]),expected,`IR ${name}`);
        if(mapped!==undefined) {const value=expected?mapped:undefined;assert.equal(original.lookup(input),value);assert.equal(translated.lookup(input),value);assert.equal(evaluate(result.program,'lookup',[input]),value);}
      }
      assert.equal(original.size(),size);assert.equal(translated.size(),size);assert.equal(evaluate(result.program,'size',[]),size);
      assert.match(result.typescript,/Readonly(?:Map|Set)<unknown/u);assert.match(result.rust,/JsStatic(?:Map|Set)/u);
      assert.ok(analyzed.diagnostics.length>0,'runtime services and unimplemented helpers still refuse');
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('SameValueZero duplicates, source order and typed missing values survive the table IR round trip',async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-static-table-duplicates-'));
  const source=`const values=new Set([-0,0,0/0,0/0,1,'1',true,'__proto__']);
const names=new Map([[-0,'first'],[0,'last'],[0/0,'nan-first'],[0/0,'nan-last'],['1','text'],[true,'bool']]);
const amounts=new Map([['x',-0],['nan',0/0],['max',1/0]]);
const flags=new Map([['x',false],['x',true]]);
export function has(value){return values.has(value);} export function size(){return values.size;}
export function lookup(value){return names.get(value);} export function mapSize(){return names.size;}
export function amount(value){return amounts.get(value);} export function flag(value){return flags.get(value);}`;
  try {
    const result=translateJavaScript(source);assert.deepEqual(parseMeta(result.meta),result.program);
    assert.equal(result.program.find(item=>item.name==='values').value.entries.length,8,'raw source entries remain in meta, including duplicates');
    assert.equal(result.program.find(item=>item.name==='names').value.entries.length,6);
    const [original,translated]=await runtimes(ts,directory,'duplicates',source,result.typescript);
    for(const [input,member,value]of [[-0,true,'last'],[0,true,'last'],[NaN,true,'nan-last'],[1,true,undefined],['1',true,'text'],[true,true,'bool'],['__proto__',true,undefined],[false,false,undefined],[1n,false,undefined],[new Number(0),false,undefined]]) {
      for(const [name,expected]of [['has',member],['lookup',value]]) {
        assert.deepEqual(original[name](input),expected);assert.deepEqual(translated[name](input),expected);assert.deepEqual(evaluate(result.program,name,[input]),expected);
      }
    }
    for(const [name,expected]of [['size',6],['mapSize',4]]) {assert.equal(original[name](),expected);assert.equal(translated[name](),expected);assert.equal(evaluate(result.program,name==='mapSize'?'map_size':name,[]),expected);}
    for(const [input,expected]of [['x',-0],['nan',NaN],['max',Infinity],['absent',undefined]]) {assert.ok(Object.is(original.amount(input),expected));assert.ok(Object.is(translated.amount(input),expected));assert.ok(Object.is(evaluate(result.program,'amount',[input]),expected));}
    assert.equal(translated.flag('x'),true);assert.equal(translated.flag('absent'),undefined);
    assert.match(result.rust,/entries\.iter\(\)\.rev\(\)/u);assert.match(result.rust,/same_key/u);assert.match(result.rust,/JsOptional<f64>/u);assert.match(result.rust,/JsOptional<bool>/u);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('whole-module proof refuses table writes, escape paths, shadowing, getter/prototype changes and dynamic constructors',()=>{
  const table="const values=new Set(['x']);",reader='export function has(value){return values.has(value);}';
  const defects=[
    'values.add("y");','values.delete("x");','values.clear();','values.has=custom;',
    'values.size=2;','(values.size)++;','++(values.size);','delete(values.size);',
    '[values.size]=[2];','({x:values.size}={x:2});','for([values.size] of [[2]]){}',
    'const alias=values;','const member=values.has;','consume(values);','export {values};','export const exposed={values};','export const exposed=()=>values;',
    'Object.defineProperty(values,"size",{get(){return 99;}});','Object.setPrototypeOf(values,custom);',
    'Set.prototype.has=custom;','const prototype=Set.prototype;','Array.prototype[Symbol.iterator]=custom;','const prototype=Array["prototype"];',
    'const Constructor=Set;','eval("values.add(\'y\')");','function unrelated(values){return values.has("x");}',
    'const hidden=`${values.add("y")}`;','const hidden=`${values}`;',
    'const hidden=`${Set.prototype.has=custom}`;','const hidden=`${Array.prototype[Symbol.iterator]=custom}`;',
    'const proto=Array["pro"+"totype"];',
    'globalThis["Set"]=custom;','globalThis["S"+"et"]=custom;',
    'const world=globalThis;','globalThis[key]=custom;',
    'const hidden=`${globalThis["Set"]=custom}`;',
  ];
  for(const defect of defects) {
    const source=table+defect+reader,result=analyzeJavaScript(source);
    assert.equal(result.program.some(item=>item.name==='values'),false,defect);
    assert.equal(result.program.some(item=>item.name==='has'),false,defect);
    assert.throws(()=>translateJavaScript(source),TranslationError,defect);
  }
  for(const source of [
    "export const values=new Set(['x']);",
    "import { Set } from 'custom'; const values=new Set(['x']);",
    "const Set=custom; const values=new Set(['x']);",
    "const values=Object.freeze(new Set(['x']));",
    "const values=new Map([['x',{data:1}]]);",
    "const values=new Map([['x','text'],['y',1]]);",
    "const values=new Set([unknown]);",
  ])assert.throws(()=>translateJavaScript(source),TranslationError,source);
});
