import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript,TranslationError} from '../translator.mjs';
import {toLino} from '../vendor/ir.mjs';
import {evaluate} from '../interpreter.mjs';
import {loadTypeScript} from '../native-typescript.mjs';

const vectors={schemaVersion:1,host:process.versions.bun?'Bun '+process.versions.bun:'Node '+process.version,rustCompiled:false,topLevel:{sourceItems:788,translatedItems:73},scopedFunctions:{sourceItems:705,translatedItems:34},census:[],bodies:[],negativeSources:[]};
const saveVectors=()=>{if(process.env.ROUTER_SCOPED_VECTORS)writeFileSync(process.env.ROUTER_SCOPED_VECTORS,JSON.stringify(vectors,null,2)+'\n');};
function encoded(value,args=[]){const argument=args.findIndex(input=>Object.is(input,value));if(argument>=0)return {argument};if(typeof value==='number')return {number:Number.isNaN(value)?'NaN':Object.is(value,-0)?'-0':String(value)};if(value===undefined)return {undefined:true};if(Array.isArray(value))return {freshArray:value.map(item=>encoded(item,args))};if(value&&typeof value==='object')return {freshRecord:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encoded(item,args)]))};return {value};}
const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
function inputs() {
  const revoked=Proxy.revocable({},{});revoked.revoke();
  return [
    {value:undefined},{value:null},{value:false},{value:true},{value:0},{value:-0},{value:NaN},{value:Infinity},{value:-1},{value:1},{value:9007199254740991},{value:9007199254740992},
    {value:0n},{value:2n**2048n},{value:Symbol('opaque')},{value:()=>{}},{value:{}},{value:[]},{value:new String('boxed')},{value:new Number(1)},{value:revoked.proxy},
    {value:{get text(){throw Error('no getter');},[Symbol.toPrimitive](){throw Error('no coercion');}}},
    {value:'',trim:''},{value:'plain',trim:'plain'},{value:' \t\n',trim:''},{value:' \ud800x\udc00\t',trim:'\ud800x\udc00'},
    {value:'\ufeff\ud800\ufeff',trim:'\ud800'},{value:'\udc00',trim:'\udc00'},{value:'\u0085 x \u0085',trim:'\u0085 x \u0085'},
    {value:' '+String.fromCodePoint(0x1f600)+' ',trim:String.fromCodePoint(0x1f600)},
    ...['force','rules','debug','partial','ANTHROPIC_MODEL','CLAUDE_CODE_SUBAGENT_MODEL','transferrepository','updateref','updaterefs','effect','method','path','body_contains'].map(value=>({value,trim:value})),
  ];
}
async function runtime(source,typescript,directory,name) {
  const ts=loadTypeScript(ROOT),original=join(directory,name+'-original.mjs'),typed=join(directory,name+'.ts'),target=join(directory,name+'-target.mjs');
  writeFileSync(original,source);writeFileSync(typed,'declare const Buffer: {byteLength(value: string): number};\n'+typescript);
  const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  writeFileSync(target,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return [(await import(pathToFileURL(original).href)).original,(await import(pathToFileURL(target).href)).original];
}
const fixtures=[
 ['accounts.mjs',2692,'not-string'],['auth-service.mjs',2201,'trim-filter'],
 ['client-catalog.mjs',1672,'string'],['client-catalog.mjs',1750,'string'],['client-catalog.mjs',1873,'string'],
 ['client-status.mjs',3464,'not-model-key'],['config.mjs',3827,'empty-string'],['config.mjs',5003,'empty-string'],['config.mjs',13245,'false'],
 ['github-proxy.mjs',1761,'transfer'],['github-proxy.mjs',2097,'update-ref'],['github-proxy.mjs',2207,'force'],['github-proxy.mjs',3721,'not-rules'],['github-proxy.mjs',3929,'not-rule-key'],
 ['managed-server.mjs',3370,'nonempty-original'],['managed-server.mjs',22833,'null'],['native-service.mjs',33673,'original-filter'],['native-service.mjs',34701,'original-filter'],
 ['oauth.mjs',6404,'not-string'],['oauth.mjs',21967,'record'],['oauth.mjs',29478,'not-nonempty'],['operations.mjs',3429,'partial-array'],['operations.mjs',20868,'string'],
 ['protocols.mjs',11662,'not-nonnegative'],['provider-manifest.mjs',1141,'not-string'],['provider-manifest.mjs',4377,'not-string'],['request-log.mjs',10692,'zero-array'],
 ['response-contracts.mjs',6485,'original-filter'],['response-contracts.mjs',8748,'original-filter'],['server.mjs',15763,'not-debug'],['token-reservation.mjs',677,'nonnegative'],
 ['tokens.mjs',1846,'empty-string'],['tokens.mjs',7933,'not-string'],['usage.mjs',247,'defined'],
];
function expected(kind,input,second) {
  const value=input.value;
  switch(kind) {
    case 'string':return typeof value==='string';case 'not-string':return typeof value!=='string';
    case 'trim-filter':return typeof value==='string'?input.trim:false;
    case 'empty-string':return typeof value!=='string'||input.trim==='';
    case 'nonempty-original':return typeof value==='string'&&input.trim!==''?value:undefined;
    case 'original-filter':return typeof value==='string'?value:false;
    case 'not-nonempty':return typeof value!=='string'||value==='';
    case 'nonnegative':return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
    case 'not-nonnegative':return !(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0);
    case 'not-model-key':return value!=='ANTHROPIC_MODEL'&&value!=='CLAUDE_CODE_SUBAGENT_MODEL';
    case 'transfer':return ['transferrepository','updaterepositoryruleset','createrepositoryruleset','updateorganizationruleset','createorganizationruleset','updatebranchprotectionrule','createbranchprotectionrule'].some(key=>value===key);
    case 'update-ref':return value==='updateref'||value==='updaterefs';case 'force':return value==='force'&&second===true;
    case 'not-rules':return value!=='rules';case 'not-debug':return value!=='debug';
    case 'not-rule-key':return value!=='effect'&&value!=='method'&&value!=='path'&&value!=='body_contains';
    case 'partial-array':return [value,'partial'];case 'zero-array':return [value,0];case 'record':return {};case 'defined':return value!==undefined;
    case 'false':return false;case 'null':return null;default:throw Error(kind);
  }
}
function golden(actual,expected) {
  if(Array.isArray(expected)){assert.ok(Array.isArray(actual));assert.equal(actual.length,expected.length);expected.forEach((value,index)=>assert.ok(Object.is(actual[index],value)));}
  else if(expected&&typeof expected==='object'){assert.equal(Object.getPrototypeOf(actual),Object.prototype);assert.deepEqual(Object.keys(actual),[]);}
  else assert.ok(Object.is(actual,expected));
}

test('complete 705 scoped census separately executes all 34 original closed bodies with unchanged top-level owners',{timeout:60000},async()=>{
  const paths=[...new Set(fixtures.map(([path])=>path))],directory=mkdtempSync(join(tmpdir(),'router-scoped-bodies-'));let supported=0;
  const censusPaths=JSON.parse(readFileSync(join(ROOT,'parity/js-first-translation.json'),'utf8')).nativeCoverage.map(row=>row.path);const analyses=new Map();let total=0,top=0,topItems=0;
  try {
    for(const path of censusPaths){const source=readFileSync(join(ROOT,path),'utf8'),analysis=analyzeJavaScript(source,{sourcePath:path});assert.equal(analysis.scopedFunctions.complete,true,path);total+=analysis.scopedFunctions.sourceItems;top+=analysis.program.length;topItems+=analysis.items.length;assert.deepEqual(analysis.program,analyzeJavaScript(source,{includeScoped:false}).program);for(const item of analysis.scopedFunctions.items){assert.ok(item.owner);assert.ok(item.start>=item.owner.start&&item.end<=item.owner.end);assert.equal(item.sourcePath,path);assert.equal(item.status==='translated',analysis.scopedFunctions.program.some(fn=>fn.name===item.name));}analyses.set(path,{source,analysis});vectors.census.push({path,source,topLevelItems:analysis.items,scopedFunctions:analysis.scopedFunctions});}
    assert.equal(total,705);assert.equal(top,73);assert.equal(topItems,788);
    assert.equal([...analyses.values()].reduce((n,{analysis})=>n+analysis.scopedFunctions.translatedItems,0),fixtures.length);
    for(const [path,start,kind]of fixtures) {
      const {source,analysis}=analyses.get('packages/javascript/native/'+path),item=analysis.scopedFunctions.items.find(item=>item.start===start),fn=analysis.scopedFunctions.program.find(fn=>fn.name===item.name);assert.equal(item.status,'translated',path+':'+start);assert.deepEqual(item.captures,[]);assert.equal(item.owner.status,'unsupported');
      const meta=toLino(fn),program=parseMeta(meta);assert.deepEqual(program,[fn]);const typescript=emitTypeScript(program),rust=emitRust(program),camel=fn.name.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
      const [original,typed]=await runtime('export const original=('+source.slice(item.start,item.end)+');',typescript+`\nexport {${camel} as original};`,directory,path+'-'+start);
      const invocations=[original,typed,(...args)=>evaluate(program,fn.name,args)],observations=[];
      for(const input of inputs())for(const second of kind==='force'?[true,false,undefined,Symbol('second')]:[undefined]) {
        const args=fn.params.length===2?[input.value,second]:fn.params.length?[input.value]:[],want=expected(kind,input,second);
        const outcomes=[];for(const invoke of invocations){const first=invoke(...args);golden(first,want);outcomes.push(encoded(first,args));if(Array.isArray(want)||want&&typeof want==='object'){const next=invoke(...args);assert.notEqual(first,next);golden(next,want);}}observations.push({input:typeof input.value==='object'&&input.value!==null||['symbol','bigint','function'].includes(typeof input.value)?{opaqueType:typeof input.value}:encoded(input.value),second:typeof second==='symbol'?{symbol:true}:encoded(second),arguments:args.map(value=>typeof value==='bigint'?{bigint:value.toString()}:typeof value==='symbol'?{symbol:true}:typeof value==='function'?{function:true}:typeof value==='object'&&value!==null?{opaque:true}:encoded(value)),expected:encoded(want,args),outcomes});
      }
      if(fn.params.some(param=>param.type==='value'))assert.match(rust,/JsPayload<'a>/u);
      if(['trim-filter','nonempty-original'].includes(kind))assert.match(rust,/js_payload_trim\([^)]*\.as_utf16\(\)/u);
      vectors.bodies.push({path,start,kind,originalSource:source.slice(item.start,item.end),item,program,meta,typescript,rust,observations});saveVectors();supported++;
    }
    assert.equal(supported,34);assert.equal(paths.length,18);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('lossless guards retain opaque unmatched identity, exact UTF16 trim, finite/safe-number branches and string observations',async()=>{
  const source=`export function normalize(value){return typeof value==='string'?value.trim():value;}
export function finite(value){return Number.isFinite(value)?value:undefined;}
export function safe(value){return Number.isSafeInteger(value)?value:null;}
export function maybe(value){return typeof value==='string'?value.trim():undefined;}
export function pair(value){const result=maybe(value);return {first:result,second:result};}
export function inspect(value){return {length:typeof value==='string'?value.length:0,points:typeof value==='string'?[...value].length:0,bytes:typeof value==='string'?Buffer.byteLength(value):0,starts:typeof value==='string'&&value.startsWith('x'),ends:typeof value==='string'&&value.endsWith('x'),includes:typeof value==='string'&&value.includes('x')};}`;
  const translated=translateJavaScript(source,{lossless:true}),directory=mkdtempSync(join(tmpdir(),'router-payload-guards-'));
  try {
    const observations=[];vectors.guards={source,program:translated.program,meta:translated.meta,typescript:translated.typescript,rust:translated.rust,observations};
    const [original,typed]=await runtime(source+'\nexport const original={normalize,finite,safe,maybe,pair,inspect};',translated.typescript+'\nexport const original={normalize,finite,safe,maybe,pair,inspect};',directory,'guards');
    for(const input of inputs())for(const name of ['normalize','finite','safe']) {
      const want=name==='normalize'?(typeof input.value==='string'?input.trim:input.value):name==='finite'?(typeof input.value==='number'&&Number.isFinite(input.value)?input.value:undefined):(typeof input.value==='number'&&Number.isSafeInteger(input.value)?input.value:null);
      const outcomes=[];for(const invoke of [original[name],typed[name],value=>evaluate(translated.program,name,[value])]){const actual=invoke(input.value);assert.ok(Object.is(actual,want),name);outcomes.push(encoded(actual,[input.value]));}observations.push({name,inputType:typeof input.value,expected:encoded(want,[input.value]),outcomes});
    }
    for(const input of inputs())for(const invoke of [original.pair,typed.pair,value=>evaluate(translated.program,'pair',[value])]){const want=typeof input.value==='string'?input.trim:undefined;const actual=invoke(input.value);assert.deepEqual(actual,{first:want,second:want});assert.notEqual(actual,invoke(input.value));}
    assert.match(translated.rust,/first: result.clone\(\), second: result.clone\(\)/u);
    for(const input of [{value:'x\ud800x',length:3,points:3,bytes:5,starts:true,ends:true,includes:true},{value:String.fromCodePoint(0x1f600),length:2,points:1,bytes:4,starts:false,ends:false,includes:false},{value:'\udc00',length:1,points:1,bytes:3,starts:false,ends:false,includes:false}])for(const invoke of [original.inspect,typed.inspect,value=>evaluate(translated.program,'inspect',[value])]){const {value,...want}=input;assert.deepEqual(invoke(value),want);}
    for(const unit of [9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279])for(const invoke of [original.normalize,typed.normalize,value=>evaluate(translated.program,'normalize',[value])])assert.equal(invoke(String.fromCharCode(unit)+'\ud800'+String.fromCharCode(unit)),'\ud800');
    assert.match(translated.rust,/fn normalize<'a>\(value: JsPayload<'a>\) -> JsPayload<'a>/u);assert.match(translated.rust,/JsPayload::String\(js_payload_trim\(value.as_utf16\(\)\)\)/u);assert.match(translated.rust,/Self::Null \| Self::Object\(_\) => "object"/u);assert.doesNotMatch(translated.rust,/String::from_utf16_lossy/u);saveVectors();
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('genuine original bindings refuse captures, effects, dynamic scopes and intrinsic mutation before scoped emission',()=>{
  const defects=[
    'const captured=1;const fn=value=>value===captured;',
    'const fn=value=>({captured});','const fn=()=>this;','const fn=()=>arguments;','const fn=()=>new.target;',
    'const fn=async value=>value;','function* fn(){yield 1;}','const fn=(value=sideEffect())=>value;',
    'const fn=value=>value.field;','const fn=value=>String(value);','const fn=value=>value?value:null;',
    'const fn=value=>({get field(){return value;}});','with(external){const fn=value=>typeof value;}','const fn=value=>eval("value");',
    'function nested(Number){const fn=value=>Number.isFinite(value);}','const {Number}=external;const fn=value=>Number.isFinite(value);',
  ];
  for(const defect of defects){const source='export function owner(external){'+defect+'}',analysis=analyzeJavaScript(source);vectors.negativeSources.push({source,scopedFunctions:analysis.scopedFunctions});assert.equal(analysis.program.length,0,defect);assert.equal(analysis.scopedFunctions.translatedItems,0,defect);assert.ok(analysis.scopedFunctions.sourceItems>0,defect);}
  for(const defect of ['Number.isFinite=custom;','(Number.isFinite)=custom;','[Number.isFinite]=[custom];','delete(Number.isFinite);','globalThis["Num"+"ber"]=custom;','const hidden=`${Number.isFinite=custom}`;','Object["getPrototypeOf"](String).trim=custom;','String["pro"+"totype"].trim=custom;','const alias=Number;','mutate(String);','mutate(Array);','const escaped=RegExp;']) {
    const source='export function owner(){const fn=value=>Number.isFinite(value);'+defect+'}';const analyzed=analyzeJavaScript(source);vectors.negativeSources.push({source,scopedFunctions:analyzed.scopedFunctions});assert.equal(analyzed.scopedFunctions.translatedItems,0,defect);
  }
  for(const source of ['export function unsafe(value){return value?1:0;}','export function unsafe(value){return String(value).trim();}','export function unsafe(value){return value.name;}','/** @param {string} value */ export function unsafe(value){return value.trim();}','export function unsafe(value){return [\'string\'].includes(typeof value);}'])assert.throws(()=>translateJavaScript(source,{lossless:true}),TranslationError,source);
  const source='export function owner(){const fn=value=>typeof value===\'string\';}',first=analyzeJavaScript(source,{sourcePath:'a.mjs'}),second=analyzeJavaScript(source,{sourcePath:'b.mjs'});assert.equal(first.scopedFunctions.translatedItems,1);assert.notEqual(first.scopedFunctions.program[0].name,second.scopedFunctions.program[0].name);assert.deepEqual(first.scopedFunctions,analyzeJavaScript(source,{sourcePath:'a.mjs'}).scopedFunctions);
  const owned=analyzeJavaScript('export function owner(value){const captured=1;const fn=value=>{const captured=value;return {captured};};}');assert.equal(owned.scopedFunctions.translatedItems,1);assert.deepEqual(owned.scopedFunctions.items[0].captures,[]);
  const guarded=translateJavaScript('export function trim(value){return typeof value===\'string\'?value.trim():value;}',{lossless:true});assert.throws(()=>parseMeta(guarded.meta.replace('(lossless)','')));assert.throws(()=>parseMeta(guarded.meta.replace('(string string)','(string number)')));assert.throws(()=>parseMeta('(function source (lossless) (parameters (value utf16-string)) (returns utf16-string) (body (return (variable value))))\n(function copy (lossless) (parameters) (returns utf16-string) (body (let alias (call source (string x))) (return (variable alias))))'),/owned UTF16 local/u);saveVectors();
});
