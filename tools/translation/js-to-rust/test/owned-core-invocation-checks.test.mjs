import nativeTest from 'node:test';
import assert from 'node:assert/strict';
import {Hash,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript,parseOwnedCoreDocumentMeta,emitRust} from '../translator.mjs';
import {ownedCoreRuntimeSources} from '../owned-core-source.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {writeLink,encodeWord,parseLinks,textOf} from '../vendor/lino.mjs';
import {json_macro_null,json_macro_string,json_macro_object,json_macro_array} from '../../json-macro-runtime.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),baseURL=new URL('../owned-core-operations.mjs',import.meta.url);
const nativeJSON=JSON.stringify,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const hash=value=>createHash('sha256').update(value).digest('hex');
const imports="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\n",types="import type {JsonValue} from './runtime/json-macro-runtime.mjs';\n";
let serial=0,caseIndex=0;
function test(name,run){const index=++caseIndex;nativeTest(name,{timeout:60000},async t=>{let event=0;const keep=(label,value)=>{
 const folder=process.env.ROUTER_OWNED_INVOCATION_VECTOR_DIR;if(!folder)return;
 mkdirSync(folder,{recursive:true});const raw=nativeJSON(value,(_key,item)=>typeof item==='bigint'?{$integer:String(item)}:item),bytes=Buffer.from(raw+'\n'),packed=gzipSync(bytes);
 const path=join(folder,String(index).padStart(2,'0')+'-'+String(++event).padStart(3,'0')+'-'+label+'.json.gz');writeFileSync(path,packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path)),bytes);
 };try{await run(t,keep);}catch(error){keep('failure',{name:error?.name,message:error?.message});throw error;}});}
function read(path){return readFileSync(join(ROOT,path),'utf8');}
function files(count=2,padding=''){
 const bodies=Array.from({length:count},(_,at)=>({js:'export function copied_'+at+'(value){return copy(value);}',ts:'export function copied_'+at+'(value:JsonValue):JsonValue{return copy(value);}'}));
 const js=imports+padding+bodies.map(row=>row.js).join('\n'),ts=imports+types+padding+bodies.map(row=>row.ts).join('\n');
 return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:read('Cargo.toml')},{path:'Cargo.lock',source:read('Cargo.lock')},{path:'caller.mjs',source:js},{path:'caller.mts',source:ts}]};
}
function write(root,path,source){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}
function archive(root,keep){const rows=[];function visit(path,relative){for(const name of readdirSync(path)){const full=join(path,name),local=relative?relative+'/'+name:name,stat=lstatSync(full);assert.equal(stat.isSymbolicLink(),false);if(stat.isDirectory())visit(full,local);else{assert.equal(stat.isFile(),true);const bytes=readFileSync(full);rows.push({path:local,bytes:bytes.length,sha256:hash(bytes),base64:bytes.toString('base64')});}}}visit(root,'');keep('complete-typed-files',{rows});}
function hashes(run,onUpdate){const update=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),tape=[];let result,error,failed=false;
 try{define(Hash.prototype,'update',{...update,value:function(...args){const output=apply(update.value,this,args);tape.push({operation:'update',args:args.map(value=>typeof value==='string'?{type:'string',value}:{type:'bytes',base64:Buffer.from(value).toString('base64')}),sameReceiver:output===this});if(onUpdate)onUpdate();return output;}});define(Hash.prototype,'digest',{...digest,value:function(...args){const output=apply(digest.value,this,args);tape.push({operation:'digest',args,value:typeof output==='string'?output:{base64:Buffer.from(output).toString('base64')}});return output;}});try{result=run();}catch(thrown){failed=true;error=thrown;}}
 finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}
 return {result,tape,failed,error,errorData:failed?{name:error?.name,message:error?.message}:null};
}
const OLD_OPERATIONS=[
 "// Checked owned-core operations, separate from the legacy portable profile.",
 "// The body is always reconstructed from the current complete original source.",
 "import {isDeepStrictEqual,types} from 'node:util';",
 "import {posix} from 'node:path';",
 "import {analyzeOriginalOwnedCoreSource,requireOwnedCoreSourceCurrent,ownedPlainData,ownedCoreSourceData} from './owned-core-source.mjs';",
 "const issued=new WeakMap(),runtimes=new WeakMap();",
 "const fail=message=>{throw new TypeError('Owned reverse operation: '+message);};",
 "const OPS=Object.freeze({",
 " router_core_json_copy:{args:['json'],ret:'json',rust:'json_copy'},",
 " router_core_json_with_field:{args:['json','str','json'],ret:'json',rust:'json_with_field'},",
 " router_core_json_index_str:{args:['json','str'],ret:'json-ref',rust:'json_index_str',root:0},",
 " router_core_json_index_usize:{args:['json','usize'],ret:'json-ref',rust:'json_index_usize',root:0},",
 " router_core_json_map_index:{args:['map-ref','str'],ret:'json-ref',rust:'json_map_index',root:0},",
 " json_macro_value:{args:['json'],ret:'json',rust:'json_copy'},",
 " json_macro_null:{args:[],ret:'json',rust:null},",
 " json_macro_bool:{args:['bool'],ret:'json',rust:null},",
 " json_macro_string:{args:['str'],ret:'json',rust:null},",
 " json_macro_u64:{args:['u64'],ret:'json',rust:null},",
 " json_macro_i64:{args:['i64'],ret:'json',rust:null},",
 "});",
 "const KEYS=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual'.split(' '));",
 "function rustName(name){",
 " if(!/^[a-z][A-Za-z0-9_]*$/u.test(name)||KEYS.has(name))fail('nonportable declaration name');",
 " const rust=name.replace(/[A-Z]/gu,c=>'_'+c.toLowerCase());if(KEYS.has(rust))fail('reserved declaration name');return rust;",
 "}",
 "const json=type=>type==='json'||type==='json-ref';",
 "const compatible=(actual,wanted)=>wanted==='json'?json(actual):wanted==='i64'?actual==='i64'||actual==='usize':wanted==='u64'?actual==='usize':actual===wanted;",
 "/** Only a private original check can create an executable item. */",
 "export const isOwnedCoreItem=item=>!!item&&typeof item==='object'&&!types.isProxy(item)&&Object.getOwnPropertyDescriptor(item,'kind')?.value==='owned-function';",
 "export function analyzeOwnedCoreModule(context,path){",
 " const result=analyzeOriginalOwnedCoreSource(context,path);",
 " for(const item of result.program)issued.set(item,{context});",
 " return result;",
 "}",
 "/** Reconstruct the exact original function; detached or edited items refuse. */",
 "export function checkOwnedCoreItem(item,context=issued.get(item)?.context){",
 " if(!context)fail('unissued function');const input=ownedPlainData(item),analysis=analyzeOwnedCoreModule(context,input.source.path);",
 " if(analysis.source!==input.source.source)fail('complete caller source differs');",
 " const candidates=analysis.program.filter(value=>value.source.span[0]===input.source.span[0]&&value.source.span[1]===input.source.span[1]);",
 " if(candidates.length!==1)fail('original function span or checked domain differs');const result=candidates[0];",
 " if(!isDeepStrictEqual(result,input))fail('checked function/meta differs');return result;",
 "}",
 "export function checkOwnedCoreProgram(program,context){",
 " if(!Array.isArray(program)||program.length>4096)fail('invalid program');const names=new Set();return program.map(item=>{const result=checkOwnedCoreItem(item,context);if(names.has(result.name))fail('duplicate function');names.add(result.name);return result;});",
 "}",
 "export function ownedCoreContext(item){return issued.get(checkOwnedCoreItem(item))?.context;}",
 "const rustString=value=>'\"'+value.replace(/[\\\\\"\\x00-\\x1f\\x7f]/gu,c=>({'\\\\':'\\\\\\\\','\"':'\\\\\"','\\n':'\\\\n','\\r':'\\\\r','\\t':'\\\\t'}[c]??'\\\\u{'+c.codePointAt(0).toString(16)+'}'))+'\"';",
 "const TS_TYPES={json:'JsonValue','json-ref':'JsonValue','map-ref':\"Extract<JsonValue,{readonly $:'Object'}>['field0']\",str:'string',bool:'boolean',usize:'bigint'};",
 "const RUST_TYPES={json:'crate::translation_core::Json','json-ref':\"&'a crate::translation_core::Json\",'map-ref':\"&'a ::serde_json::Map<::std::string::String,crate::translation_core::Json>\",str:\"&'a str\",bool:'bool',usize:'u64'};",
 "export function emitOwnedCoreProgram(input,target,{outputPath}={}){",
 " const program=checkOwnedCoreProgram(input),rust=target==='rust';if(!rust&&target!=='typescript')fail('unknown target');if(!program.length)return '';",
 " const context=issued.get(program[0]).context;requireOwnedCoreSourceCurrent(context);const sourceData=ownedCoreSourceData(context);",
 " if(program.some(item=>issued.get(item).context!==context))fail('mixed receiving contexts');",
 " let sequence=0;const imports=new Set();",
 " function expr(value,borrowOwned=false){",
 "  switch(value.kind){",
 "   case 'variable':return rust?(value.type==='json'?(borrowOwned?'&'+rustName(value.name):'__ro_copy(&'+rustName(value.name)+')'):rustName(value.name)):value.name;",
 "   case 'string':return rust?rustString(value.value):JSON.stringify(value.value);",
 "   case 'bool':return String(value.value);",
 "   case 'integer':return rust?value.value+'_u64':value.value+'n';",
 "   case 'not':return '(!'+expr(value.value)+')';",
 "   case 'binary':return '('+expr(value.left)+' '+(rust?({'===':'==','!==':'!='}[value.op]??value.op):value.op)+' '+expr(value.right)+')';",
 "   case 'choose':return rust?'(if '+expr(value.cond)+' { '+expr(value.then)+' } else { '+expr(value.else)+' })':'('+expr(value.cond)+' ? '+expr(value.then)+' : '+expr(value.else)+')';",
 "   case 'json-array':case 'json-object':{",
 "    const name=value.kind==='json-array'?'json_macro_array':'json_macro_object';imports.add(name);",
 "    const children=value.kind==='json-array'?value.items:value.entries.map(entry=>entry.value);",
 "    if(!rust)return '__ro_'+name+'(['+(value.kind==='json-array'?children.map(child=>expr(child)):value.entries.map(entry=>'['+JSON.stringify(entry.key)+', '+expr(entry.value)+']')).join(', ')+'])';",
 "    const names=children.map(()=> '__ro_json_'+sequence++),bindings=children.map((child,index)=>'let '+names[index]+' = '+expr(child)+';');",
 "    const literal=value.kind==='json-array'?'['+names.join(', ')+']':'{'+value.entries.map((entry,index)=>rustString(entry.key)+': '+names[index]).join(', ')+'}';",
 "    return '{ '+bindings.join(' ')+' let __ro_result = crate::translation_core::json!('+literal+'); __ro_domain(&__ro_result); __ro_result }';",
 "   }",
 "   case 'owned-call':{",
 "    const op=OPS[value.name];imports.add(value.name);",
 "    if(!rust)return '__ro_'+value.name+'('+value.args.map(expr).join(', ')+')';",
 "    const names=value.args.map(()=> '__ro_arg_'+sequence++),lines=value.args.map((argument,index)=>{",
 "     const source=argument.type==='json'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument);",
 "     return 'let '+names[index]+' = '+source+';';",
 "    });",
 "    // All source arguments are bound in order. Owned local variables are",
 "    // borrowed here; compensating copies happen only inside the fixed call.",
 "    const args=names;",
 "    let call;",
 "    if(value.name==='json_macro_null')call='::serde_json::Value::Null';",
 "    else if(value.name==='json_macro_bool')call='::serde_json::Value::Bool('+args[0]+')';",
 "    else if(value.name==='json_macro_string')call='::serde_json::Value::String('+args[0]+'.to_owned())';",
 "    else if(value.name==='json_macro_u64')call='::serde_json::Value::from('+args[0]+')';",
 "    else if(value.name==='json_macro_i64')call='::serde_json::Value::from(i64::try_from('+args[0]+').expect(\"owned reverse i64 bound\"))';",
 "    else if(op.rust==='json_copy')call='__ro_copy('+args.join(', ')+')';",
 "    else if(op.rust==='json_with_field')call='__ro_with_field('+args.join(', ')+')';",
 "    else if(op.rust==='json_index_usize')call='match usize::try_from('+args[1]+') { Ok(index) => crate::translation_core::json_index_usize('+args[0]+', index), Err(_) => &::serde_json::Value::Null }';",
 "    else call='crate::translation_core::'+op.rust+'('+args.join(', ')+')';",
 "    return '{ '+lines.join(' ')+' '+call+' }';",
 "   }",
 "   default:fail('unissued expression kind');",
 "  }",
 " }",
 " function body(statements,indent){return statements.map(statement=>{",
 "  const pad=' '.repeat(indent);",
 "  if(statement.kind==='let')return pad+(rust?'let ':'const ')+(rust?rustName(statement.name):statement.name)+' = '+expr(statement.value)+';';",
 "  if(statement.kind==='return')return pad+'return '+expr(statement.value)+';';",
 "  return pad+'if '+(rust?'':'(')+expr(statement.cond)+(rust?'':')')+' {\\n'+body(statement.then,indent+4)+'\\n'+pad+'} else {\\n'+body(statement.else,indent+4)+'\\n'+pad+'}';",
 " }).join('\\n');}",
 " const code=program.map(item=>{",
 "  const borrowed=type=>['json-ref','map-ref','str'].includes(type),loan=borrowed(item.returns),explicit=loan&&item.resultRoot!==null&&item.params.filter(param=>borrowed(param.type)).length>1;",
 "  const parameters=item.params.map(param=>{",
 "   const type=rust?RUST_TYPES[param.type].replace(\"'a \",explicit&&param.name===item.resultRoot?\"'a \":''):TS_TYPES[param.type];",
 "   return (rust?param.rust:param.name)+': '+type;",
 "  }).join(', ');",
 "  const returns=rust?RUST_TYPES[item.returns].replace(\"'a \",item.resultRoot===null?\"'static \":explicit?\"'a \":''):TS_TYPES[item.returns];",
 "  const signature=rust?'#[must_use]\\n#[rustfmt::skip]\\n'+(item.exported?'pub ':'')+'fn '+item.name+(explicit?\"<'a>\":'')+'(':(item.exported?'export ':'')+'function '+item.javascript+'(';",
 "  return signature+parameters+')'+(rust?' -> ':': ')+returns+' {\\n'+body(item.body,4)+'\\n}';",
 " }).join('\\n\\n');",
 " requireOwnedCoreSourceCurrent(context);",
 " if(rust)return RUST_SUPPORT+'\\n\\n'+code+'\\n';",
 " const output=outputPath??program[0].source.path,relative=name=>{const path=posix.relative(posix.dirname(output),sourceData.runtimeRoot+'/'+name);return path.startsWith('.')?path:'./'+path;};",
 " const lines=['import type {JsonValue} from '+JSON.stringify(relative('json-macro-runtime.mjs'))+';'];",
 " for(const family of ['json-update','json-macro']){",
 "  const names=[...imports].filter(name=>(name.startsWith('json_macro_')?'json-macro':'json-update')===family);",
 "  if(names.length)lines.push('import { '+names.map(name=>name+' as __ro_'+name).join(', ')+' } from '+JSON.stringify(relative(family+'-runtime.mjs'))+';');",
 " }",
 " return lines.join('\\n')+'\\n\\n'+code+'\\n';",
 "}",
 "// Matching the canonical successful-resource envelope is part of this NEW",
 "// profile. Native panics are not advertised as catchable JavaScript Errors.",
 "export const RUST_SUPPORT=`#[allow(dead_code)]",
 "#[rustfmt::skip]",
 "fn __ro_domain(value: &crate::translation_core::Json) {",
 "    fn visit(value: &crate::translation_core::Json, depth: usize, nodes: &mut usize) {",
 "        *nodes += 1;",
 "        assert!(*nodes <= 4096 && depth <= 32, \"owned reverse JSON budget\");",
 "        match value {",
 "            ::serde_json::Value::Array(items) => {",
 "                assert!(items.len() <= 4096, \"owned reverse dense bound\");",
 "                for item in items { visit(item, depth + 1, nodes); }",
 "            }",
 "            ::serde_json::Value::Object(items) => {",
 "                assert!(items.len() <= 4096, \"owned reverse dense bound\");",
 "                for item in items.values() { visit(item, depth + 1, nodes); }",
 "            }",
 "            _ => {}",
 "        }",
 "    }",
 "    visit(value, 0, &mut 0);",
 "}",
 "#[allow(dead_code)]",
 "#[rustfmt::skip]",
 "fn __ro_copy(value: &crate::translation_core::Json) -> crate::translation_core::Json {",
 "    __ro_domain(value);",
 "    crate::translation_core::json_copy(value)",
 "}",
 "#[allow(dead_code)]",
 "#[rustfmt::skip]",
 "fn __ro_with_field(base: &crate::translation_core::Json, key: &str, value: &crate::translation_core::Json) -> crate::translation_core::Json {",
 "    let base = __ro_copy(base);",
 "    let value = __ro_copy(value);",
 "    assert!(base.is_null() || base.is_object(), \"Owned JSON string-key update requires an object or null\");",
 "    let result = crate::translation_core::json_with_field(base, key, value);",
 "    __ro_domain(&result);",
 "    result",
 "}`;",
 "/** Prepare only the actual registered module, after fresh complete source joins. */",
 "export async function prepareOwnedCoreRuntime(input){",
 " const program=checkOwnedCoreProgram(input),modules={update:await import('../json-update-runtime.mjs'),macro:await import('../json-macro-runtime.mjs')};",
 " checkOwnedCoreProgram(program);const token=Object.freeze({schema:'owned-core-runtime-v1'});runtimes.set(token,{program,modules});return token;",
 "}",
 "export function evaluateOwnedCoreProgram(input,name,args,token){",
 " const program=checkOwnedCoreProgram(input),state=runtimes.get(token);if(!state||!isDeepStrictEqual(state.program,program))fail('unissued runtime/program');",
 " const item=program.find(item=>item.name===name||item.javascript===name);if(!item||!Array.isArray(args)||args.length!==item.params.length)fail('actual arguments differ');",
 " const env=new Map(item.params.map((param,index)=>[param.name,args[index]]));",
 " const get=(value,scope)=>{",
 "  switch(value.kind){",
 "   case 'variable':return scope.get(value.name);",
 "   case 'string':case 'bool':return value.value;",
 "   case 'integer':return BigInt(value.value);",
 "   case 'not':return !get(value.value,scope);",
 "   case 'choose':return get(value.cond,scope)?get(value.then,scope):get(value.else,scope);",
 "   case 'binary':{const left=get(value.left,scope);if(value.op==='&&')return left&&get(value.right,scope);if(value.op==='||')return left||get(value.right,scope);const right=get(value.right,scope);return value.op==='==='?left===right:left!==right;}",
 "   case 'json-array':return state.modules.macro.json_macro_array(value.items.map(child=>get(child,scope)));",
 "   case 'json-object':return state.modules.macro.json_macro_object(value.entries.map(entry=>[entry.key,get(entry.value,scope)]));",
 "   case 'owned-call':{const module=value.name.startsWith('json_macro_')?state.modules.macro:state.modules.update;return Reflect.apply(module[value.name],undefined,value.args.map(value=>get(value,scope)));}",
 "   default:fail('unknown evaluated expression');",
 "  }",
 " };",
 " const run=(body,scope)=>{for(const statement of body){if(statement.kind==='let')scope.set(statement.name,get(statement.value,scope));else if(statement.kind==='return')return get(statement.value,scope);else return run(get(statement.cond,scope)?statement.then:statement.else,new Map(scope));}fail('no return');};",
 " return run(item.body,env);",
 "}",
 "",
] .join('\n');

function relocated(source,base,overrides={}){const edits=[];const after=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/gu,(whole,prefix,quote,path)=>{const next=prefix+quote+(overrides[path]??new URL(path,base).href)+quote;edits.push({before:whole,after:next});return next;});let inverse=after;for(const edit of [...edits].reverse()){assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,edit.before);}assert.equal(inverse,source);return {source,after,edits,inverse};}
async function copies(keep){
 const sourcePath='tools/translation/js-to-rust/owned-core-source.mjs',source=read(sourcePath),sourceExtra="\nexport function testMutation(context,path,source){const state=contexts.get(context);if(!state)throw TypeError('test requires genuine context');state.files.set(path,source);}\n";
 const sourceStage=relocated(source,new URL('../owned-core-source.mjs',import.meta.url)),sourceText=sourceStage.after+sourceExtra+'\n// fixture '+(++serial),sourceURL='data:text/javascript;base64,'+Buffer.from(sourceText).toString('base64'),sourceAPI=await import(sourceURL);
 const result={sourceAPI};
 for(const [label,original]of [['old',OLD_OPERATIONS],['current',read('tools/translation/js-to-rust/owned-core-operations.mjs')]]){
  const stage=relocated(original,baseURL,{'./owned-core-source.mjs':sourceURL});let code=stage.after;
  const importBefore='analyzeOriginalOwnedCoreSource,requireOwnedCoreSourceCurrent,ownedPlainData';assert.equal(code.split(importBefore).length,2);code=code.replace(importBefore,'analyzeOriginalOwnedCoreSource,requireOwnedCoreSourceCurrent as actualCurrent,ownedPlainData');
  const first='export function analyzeOwnedCoreModule(context,path){';assert.equal(code.split(first).length,2);code=code.replace(first,first+'\n probe.analyses.push({context,path});');
  const beforeIssue=' const result=analyzeOriginalOwnedCoreSource(context,path);';assert.equal(code.split(beforeIssue).length,2);code=code.replace(beforeIssue,beforeIssue+'\n if(probe.beforeIssue)probe.beforeIssue();');
  const last='for(const item of result.program)issued.set(item,{context});\n return result;';assert.equal(code.split(last).length,2);code=code.replace(last,'for(const item of result.program)issued.set(item,{context});\n if(probe.afterAnalysis)probe.afterAnalysis(context);\n return result;');
  if(label==='current'){
   const cost=' function cost(value){';assert.equal(code.split(cost).length,2);code=code.replace(cost,cost+'\n  probe.costs++;');
   const equality="  if(!isDeepStrictEqual(result,snapshot))fail('checked function/meta differs');";assert.equal(code.split(equality).length,2);code=code.replace(equality,equality+'\n  if(probe.afterEquality)probe.afterEquality();');
   const seed='groupCount=0,retainedCells=0,retainedUnits=0;';assert.equal(code.split(seed).length,2);code=code.replace(seed,'groupCount=probe.initialGroups??0,retainedCells=probe.initialCells??0,retainedUnits=probe.initialUnits??0;');
   const selected="  if(analysis.source!==snapshot.source.source)fail('complete caller source differs');";assert.equal(code.split(selected).length,2);code=code.replace(selected,'  probe.selected++;\n'+selected);
  }
  const prefix="const probe={analyses:[],directCurrent:[],selected:0,costs:0,afterAnalysis:null,afterCurrent:null,beforeIssue:null,afterEquality:null};\nfunction requireOwnedCoreSourceCurrent(context){probe.directCurrent.push(context);const result=actualCurrent(context);if(probe.afterCurrent)probe.afterCurrent(context);return result;}\n";
  code=prefix+code+'\nexport {probe as invocationProbe};\n// fixture '+(++serial);
  const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64'),api=await import(url);result[label]={api,probe:api.invocationProbe,original,stage,code,url};
 }
 const documentSource=read('tools/translation/js-to-rust/owned-core-document.mjs'),documentStage=relocated(documentSource,new URL('../owned-core-document.mjs',import.meta.url),{'./owned-core-source.mjs':sourceURL,'./owned-core-operations.mjs':result.current.url});result.document=await import('data:text/javascript;base64,'+Buffer.from(documentStage.after+'\n// fixture '+(++serial)).toString('base64'));
 keep('complete-document-copy',{documentSource,documentStage});
 keep('complete-compiler-copies',{sourcePath,source,sourceStage,sourceText,old:{source:result.old.original,stage:result.old.stage,code:result.old.code},current:{source:result.current.original,stage:result.current.stage,code:result.current.code}});return result;
}
function selected(copy,context,path='caller.mjs'){return copy.api.analyzeOwnedCoreModule(context,path).program;}
function reset(copy){copy.probe.analyses.length=0;copy.probe.directCurrent.length=0;copy.probe.selected=0;copy.probe.costs=0;}
function failure(run){try{return {failed:false,value:run()};}catch(error){return {failed:true,error,name:error?.name,message:error?.message};}}
// Evidence for deliberately altered snapshots must not evaluate their getters.
function describe(value,seen=new Map()){
 if(value===null||typeof value!=='object'&&typeof value!=='function')return typeof value==='undefined'?{undefined:true}:value;
 if(typeof value==='function')return {functionSource:apply(Function.prototype.toString,value,[])};
 if(seen.has(value))return {reference:seen.get(value)};const id=seen.size;seen.set(value,id);const fields=Object.getOwnPropertyDescriptors(value),rows=[];
 for(const name of Reflect.ownKeys(value)){const field=fields[name],common={name,enumerable:field.enumerable,configurable:field.configurable};rows.push(Object.hasOwn(field,'value')?{...common,kind:'data',writable:field.writable,value:describe(field.value,seen)}:{...common,kind:'accessor',get:describe(field.get,seen),set:describe(field.set,seen)});}
 return {id,prototype:Object.getPrototypeOf(value)===null?'null':Array.isArray(value)?'Array.prototype':'Object.prototype',rows};
}

test('complete twelve-function originals keep both target and independent Unicode copy behavior',async(t,keep)=>{
 const data=files(12),context=createOwnedCoreSourceContext(data),js=data.files.find(row=>row.path==='caller.mjs').source,result=translateOwnedCoreDocumentJavaScript(js,{sourcePath:'caller.mjs',context,typescriptOutputPath:'reverse.mts'});
 keep('complete-initial-translation',{data,result});assert.equal(result.program.length,12);const parsed=parseOwnedCoreDocumentMeta(result.meta,{context});assert.deepEqual(parsed,result.program);assert.equal(emitRust(parsed),result.rust);
 const directory=mkdtempSync(join(tmpdir(),'owned-invocation-targets-'));
 try{
  for(const file of data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(directory,file.path,file.source);write(directory,'reverse.mts',result.typescript);
  const compiler=process.env.ROUTER_TRANSLATION_TSC??process.execPath,prefix=process.env.ROUTER_TRANSLATION_TSC===undefined?[join(ROOT,'js/node_modules/typescript/bin/tsc')]:[];
  let child;try{child=execFileSync(compiler,[...prefix,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),join(directory,'caller.mts'),join(directory,'reverse.mts')],{cwd:ROOT,encoding:'utf8',timeout:20000,maxBuffer:16777216,stdio:'pipe'});}catch(error){keep('strict-failure',{stdout:String(error.stdout??''),stderr:String(error.stderr??''),status:error.status,signal:error.signal});throw error;}
  keep('strict-complete-output',{stdout:child});for(const file of data.files.filter(row=>row.path.startsWith('runtime/')))write(directory,'out/'+file.path,file.source);
  const original=await import(pathToFileURL(join(directory,'caller.mjs')).href),typed=await import(pathToFileURL(join(directory,'out/caller.mjs')).href),reverse=await import(pathToFileURL(join(directory,'out/reverse.mjs')).href),runtime=await prepareOwnedCoreRuntime(result.program),value=json_macro_object([['é🦀',json_macro_array([json_macro_string('漢字'),json_macro_null()])]]),observed=[];
  for(let at=0;at<12;at++){const name='copied_'+at,values=[original[name](value),typed[name](value),reverse[name](value),evaluate(result.program,name,[value],runtime)];for(const actual of values){assert.deepEqual(actual,value);assert.notEqual(actual,value);assert.notEqual(actual.field0,value.field0);}observed.push({name,values});}
  keep('complete-original-targets',{data,result,parsed,observed});
 }finally{archive(directory,keep);rmSync(directory,{recursive:true,force:true});}
});

test('one invocation groups full modules while every standalone call reconstructs again',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(3),context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context);reset(pairs.current);reset(pairs.old);
 const before=pairs.old.api.checkOwnedCoreProgram(program,context),after=pairs.current.api.checkOwnedCoreProgram(program,context);assert.deepEqual(after,before);assert.equal(pairs.old.probe.analyses.length,3);assert.equal(pairs.current.probe.analyses.length,1);assert.equal(pairs.current.probe.directCurrent.length,3);assert.equal(pairs.current.probe.selected,3);
 assert.notEqual(after[0],program[0]);assert.notEqual(after[0],after[1]);const count=pairs.current.probe.analyses.length;pairs.current.api.checkOwnedCoreItem(program[0],context);pairs.current.api.checkOwnedCoreItem(program[0],context);assert.equal(pairs.current.probe.analyses.length,count+2);
 const second=pairs.sourceAPI.createOwnedCoreSourceContext(data),other=selected(pairs.current,second);reset(pairs.current);const mixed=pairs.current.api.withOwnedCoreItemChecks(check=>[check(program[0],context),check(other[1],second),check(program[2],context)]);assert.equal(pairs.current.probe.analyses.length,2);assert.deepEqual(mixed,[program[0],other[1],program[2]]);
 const pathData={...data,files:[...data.files,...data.files.filter(row=>/^caller\.m(?:j|t)s$/u.test(row.path)).map(row=>({path:row.path.replace('caller','other'),source:row.source.replaceAll('copied_','other_')}))]},pathContext=pairs.sourceAPI.createOwnedCoreSourceContext(pathData),left=selected(pairs.current,pathContext),right=selected(pairs.current,pathContext,'other.mjs');reset(pairs.current);
 const pathMixed=pairs.current.api.withOwnedCoreItemChecks(check=>[check(left[0],pathContext),check(right[1],pathContext),check(left[2],pathContext)]);keep('same-context-complete-path-groups',{pathData,left,right,pathMixed,analyses:pairs.current.probe.analyses.length});assert.deepEqual(pathMixed,[left[0],right[1],left[2]]);assert.equal(pairs.current.probe.analyses.length,2);
 keep('independent-complete-group-counts',{data,program,before,after,mixed,old:pairs.old.probe,current:pairs.current.probe});
});

test('fresh full hash arguments follow the explicit new scope schedule without normalization',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(2),context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context);
 const warmBefore=hashes(()=>pairs.old.api.checkOwnedCoreProgram(program,context)),warmAfter=hashes(()=>pairs.current.api.checkOwnedCoreProgram(program,context));keep('complete-explicit-warmup-tapes',{warmBefore,warmAfter});assert.equal(warmBefore.failed,false);assert.equal(warmAfter.failed,false);
 const R=hashes(()=>pairs.sourceAPI.requireOwnedCoreSourceCurrent(context)),A=hashes(()=>pairs.old.api.analyzeOwnedCoreModule(context,'caller.mjs'));
 const before=hashes(()=>pairs.old.api.checkOwnedCoreProgram(program,context)),after=hashes(()=>pairs.current.api.checkOwnedCoreProgram(program,context));
 keep('raw-native-hash-outcomes-before-assertion',{R,A,before,after});
 assert.equal(before.failed,false);assert.equal(after.failed,false);assert.deepEqual(after.result,before.result);
 assert.deepEqual(before.tape,[...A.tape,...A.tape]);assert.deepEqual(after.tape,[...A.tape,...R.tape,...R.tape]);
 keep('full-unmodified-hash-arguments',{data,program,oneFreshCurrent:R,oneCompleteAnalysis:A,before,after,schedule:{old:'A,A',current:'A,R,R',sourceChecksInsideA:'F+2, unchanged'}});
});

test('first middle and final source runtime and Core mutations still refuse through real current guards',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(2);const outcomes=[];
 for(const [stage,path]of [['first','caller.mjs'],['middle','runtime/json-update-runtime.mjs'],['final','src/translation_core/primitives.rs']]){
  const context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context),source=data.files.find(row=>row.path===path).source;let phase='first',changed=false;
  const result=hashes(()=>pairs.current.api.withOwnedCoreItemChecks(check=>{const first=check(program[0],context);phase='middle';const second=check(program[1],context);phase='final';return [first,second];}),()=>{if(!changed&&phase===stage){changed=true;pairs.sourceAPI.testMutation(context,path,source+'\n');}});
  pairs.sourceAPI.testMutation(context,path,source);pairs.sourceAPI.requireOwnedCoreSourceCurrent(context);outcomes.push({stage,path,changed,result});keep('real-source-mutation-'+stage,{stage,path,changed,result});assert.equal(changed,true);assert.equal(result.failed,true);assert.match(result.errorData.message,/source receipt differs/u);
 }
 keep('complete-real-source-mutations',{data,outcomes});
});

test('returned row mutations cannot poison hidden source bodies ABI or duplicate identities',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(2),context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context),outcomes=[];
 for(const kind of ['body','return','name','span']){
  const result=failure(()=>pairs.current.api.withOwnedCoreItemChecks(check=>{const first=check(program[0],context);if(kind==='body')first.body[0].value.name='router_core_json_index_str';else if(kind==='return')first.returns='bool';else if(kind==='name')first.name='renamed';else first.source.span[0]++;return check(first,context);}));outcomes.push({kind,result});assert.equal(result.failed,true);assert.match(result.message,/checked function\/meta|function span/u);
 }
 const duplicate=failure(()=>pairs.current.api.checkOwnedCoreProgram([program[0],program[0]],context));assert.equal(duplicate.failed,true);assert.match(duplicate.message,/duplicate function/u);
 let captured;const mapped=[program[0],program[1]];Object.defineProperty(mapped,'map',{value:function(callback){return Array.prototype.map.call(this,(item,at,array)=>{const value=callback(item,at,array);if(at===0){captured=value;value.name='observer_changed';}return value;});}});
 const result=pairs.current.api.checkOwnedCoreProgram(mapped,context);assert.equal(result[0],captured);assert.equal(result[0].name,'observer_changed');assert.equal(result[1].name,program[1].name);assert.deepEqual(pairs.current.api.checkOwnedCoreProgram(program,context),program);
 const canonical=[];
 for(const level of ['root','nested']){
  const reordered=structuredClone(program[0]),record=level==='root'?reordered:reordered.body[0].value,kind=record.kind;delete record.kind;record.kind=kind;
  const old=pairs.old.api.checkOwnedCoreProgram([reordered],context),current=pairs.current.api.checkOwnedCoreProgram([reordered],context),meta=pairs.document.serializeOwnedCoreDocument([program[0]],{context}),rows=parseLinks(meta).map(row=>({head:row[0],value:JSON.parse(textOf(row[1]))})),item=rows.find(row=>row.head==='owned-source-item').value,changed=level==='root'?item:item.body[0].value,tag=changed.kind;delete changed.kind;changed.kind=tag;
  const noncanonical=rows.map(row=>writeLink([row.head,encodeWord(JSON.stringify(row.value))])+'\n').join(''),refusal=failure(()=>pairs.document.readOwnedCoreDocument(noncanonical,{context}));canonical.push({level,reordered,old,current,meta,noncanonical,refusal});keep('canonical-key-order-'+level,canonical.at(-1));assert.equal(JSON.stringify(current),JSON.stringify(old));assert.equal(JSON.stringify(current[0]),JSON.stringify(program[0]));assert.notEqual(current[0],reordered);assert.notEqual(current[0].body,reordered.body);assert.equal(refusal.failed,true);assert.match(refusal.message,/noncanonical checked item/u);
 }
 // The original issuer's WeakMap.set can expose its own rows. They are NOT the
 // invocation's stored data: a native-restored observer must not poison later
 // requests, and no private analysis copy is ever passed through issued.set.
 const setField=descriptor(WeakMap.prototype,'set'),issuedRows=[];let armed=false,observed;
 try{
  pairs.current.probe.beforeIssue=()=>{if(armed)return;armed=true;define(WeakMap.prototype,'set',{...setField,value:function(key,value){const output=apply(setField.value,this,[key,value]);if(key&&typeof key==='object'&&descriptor(key,'kind')?.value==='owned-function'){issuedRows.push(key);if(issuedRows.length===2)define(WeakMap.prototype,'set',setField);}return output;}});};
  observed=pairs.current.api.withOwnedCoreItemChecks(check=>{const first=check(program[0],context);assert.equal(issuedRows.length,2);const original=issuedRows[1];original.body[0].value.name='router_core_json_index_str';original.returns='bool';const forged=structuredClone(program[1]);forged.body[0].value.name=original.body[0].value.name;forged.returns=original.returns;const refused=failure(()=>check(forged,context)),second=check(program[1],context);return {first,second,forged,refused};});
 }finally{define(WeakMap.prototype,'set',setField);pairs.current.probe.beforeIssue=null;}
 keep('complete-transient-weakmap-issuer-observation',{data,program,issuedRows,observed});assert.equal(armed,true);assert.equal(issuedRows.length,2);assert.equal(observed.refused.failed,true);assert.match(observed.refused.message,/checked function\/meta/u);assert.deepEqual([observed.first,observed.second],program);assert.notEqual(observed.first,issuedRows[0]);assert.deepEqual(pairs.current.api.checkOwnedCoreProgram(program,context),program);
 keep('full-hidden-row-non-aliasing',{data,program,outcomes,duplicate,mappedResult:result,canonical,observed});
});

test('finally closes escaped checks preserves primary null and undefined and isolates nested APIs',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(2),context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context),outcomes=[];
 let escaped;const completed=pairs.current.api.withOwnedCoreItemChecks(check=>{escaped=check;return check(program[0],context);});assert.deepEqual(completed,program[0]);assert.throws(()=>escaped(program[0],context),/closed item-check invocation/u);
 for(const primary of [null,undefined,new TypeError('actual primary')]){
  let caught,threw=false;const original=data.files.find(row=>row.path==='caller.mjs').source;
  try{pairs.current.api.withOwnedCoreItemChecks(check=>{check(program[0],context);pairs.sourceAPI.testMutation(context,'caller.mjs',original+'\n');throw primary;});}catch(error){threw=true;caught=error;}finally{pairs.sourceAPI.testMutation(context,'caller.mjs',original);}
  assert.equal(threw,true);assert.equal(caught,primary);pairs.sourceAPI.requireOwnedCoreSourceCurrent(context);outcomes.push({primary:primary===undefined?'undefined':primary,caught: caught===undefined?'undefined':caught,threw});
 }
 reset(pairs.current);const nested=pairs.current.api.withOwnedCoreItemChecks(check=>[check(program[0],context),pairs.current.api.checkOwnedCoreProgram([program[1]],context)[0],check(program[1],context)]);assert.deepEqual(nested,[program[0],program[1],program[1]]);assert.equal(pairs.current.probe.analyses.length,2);
 const otherContext=pairs.sourceAPI.createOwnedCoreSourceContext(data),otherProgram=selected(pairs.current,otherContext),originalSource=data.files.find(row=>row.path==='caller.mjs').source;reset(pairs.current);let exitResult;
 try{exitResult=failure(()=>pairs.current.api.withOwnedCoreItemChecks(check=>{check(program[0],context);check(otherProgram[1],otherContext);pairs.sourceAPI.testMutation(context,'caller.mjs',originalSource+'\n');pairs.sourceAPI.testMutation(otherContext,'caller.mjs',originalSource+'\n');return 'must not escape';}));}finally{pairs.sourceAPI.testMutation(context,'caller.mjs',originalSource);pairs.sourceAPI.testMutation(otherContext,'caller.mjs',originalSource);}
 keep('complete-all-final-fence-attempts',{exitResult,directCurrent:pairs.current.probe.directCurrent,expectedContexts:[context,otherContext]});assert.equal(exitResult.failed,true);assert.match(exitResult.message,/source receipt differs/u);assert.deepEqual(pairs.current.probe.directCurrent,[context,otherContext]);
 const phantom={schema:'owned-core-source-context-v1'};assert.throws(()=>pairs.current.api.checkOwnedCoreProgram(program,phantom),/unissued source context/u);
 keep('complete-lifetime-and-error-outcomes',{data,program,completed,outcomes,nested});
});

test('post-analysis and post-current native misses disable hidden storage before selection or census',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(2),context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context),field=descriptor(Array.prototype,'filter'),defineField=descriptor(Object,'defineProperty'),outcomes=[];
 for(const phase of ['analysis','current','define','equality']){
  reset(pairs.current);let fired=false;const mutate=()=>{if(!fired){fired=true;if(phase==='define')define(Object,'defineProperty',{...defineField,value:function(...args){return apply(defineField.value,this,args);}});else define(Array.prototype,'filter',{...field,value:function(...args){return apply(field.value,this,args);}});}};
  let result;
  try{
   if(phase==='equality')pairs.current.probe.afterEquality=mutate;
   else if(phase!=='current')pairs.current.probe.afterAnalysis=mutate;
   else pairs.current.probe.afterCurrent=mutate;
   result=failure(()=>pairs.current.api.withOwnedCoreItemChecks(check=>{const first=check(program[0],context);return [first,check(program[1],context)];}));
  }finally{define(Array.prototype,'filter',field);define(Object,'defineProperty',defineField);pairs.current.probe.afterAnalysis=null;pairs.current.probe.afterCurrent=null;pairs.current.probe.afterEquality=null;}
  outcomes.push({phase,fired,result,analyses:pairs.current.probe.analyses.length,selected:pairs.current.probe.selected,costs:pairs.current.probe.costs});assert.equal(fired,true);assert.equal(result.failed,true);assert.match(result.message,/host operations|native|source operations/u);assert.equal(pairs.current.probe.selected,phase==='current'||phase==='equality'?1:0);assert.equal(pairs.current.probe.costs,phase==='current'?1:0);
 }
 reset(pairs.current);let initialBefore,initialAfter;
 try{define(Array.prototype,'filter',{...field,value:function(...args){return apply(field.value,this,args);}});initialBefore=failure(()=>pairs.old.api.checkOwnedCoreProgram(program,context));initialAfter=failure(()=>pairs.current.api.checkOwnedCoreProgram(program,context));}finally{define(Array.prototype,'filter',field);}
 keep('complete-initial-native-miss',{initialBefore,initialAfter,selected:pairs.current.probe.selected,costs:pairs.current.probe.costs});assert.equal(initialBefore.failed,true);assert.equal(initialAfter.failed,true);assert.equal(initialAfter.message,initialBefore.message);assert.equal(pairs.current.probe.selected,0);assert.equal(pairs.current.probe.costs,0);
 const transient=[];
 for(const kind of ['prototype','nonenumerable','hole','accessor']){
  reset(pairs.current);let captured=null,touched=0,changed=false,result;
  try{
   define(Object,'defineProperty',{...defineField,value:function(target,key,field){const output=apply(defineField.value,this,[target,key,field]);if(!changed&&key==='pairedSource'&&descriptor(target,'kind')?.value==='owned-function'){changed=true;captured=target;define(Object,'defineProperty',defineField);if(kind==='prototype')Object.setPrototypeOf(target,null);else if(kind==='nonenumerable')define(target,'kind',{...descriptor(target,'kind'),enumerable:false});else if(kind==='hole')delete target.params[0];else{const value=target.kind;define(target,'kind',{get(){touched++;return value;},enumerable:true,configurable:true});}}return output;}});
   result=failure(()=>pairs.current.api.checkOwnedCoreProgram([program[0]],context));
  }finally{define(Object,'defineProperty',defineField);}
  const row={kind,changed,captured:describe(captured),touched,result,selected:pairs.current.probe.selected,costs:pairs.current.probe.costs};transient.push(row);keep('complete-transient-input-'+kind,row);assert.equal(changed,true);assert.equal(touched,0);assert.equal(row.selected,0);assert.equal(row.costs,0);assert.equal(result.failed,false);assert.deepEqual(result.value,[program[0]]);
 }
 let touched=0;const accessor={};define(accessor,'kind',{get(){touched++;return 'owned-function';}});assert.throws(()=>pairs.current.api.checkOwnedCoreProgram([accessor],context),/accessor/u);assert.equal(touched,0);const proxy=new Proxy({}, {get(){touched++;throw TypeError('proxy observed');}});assert.throws(()=>pairs.current.api.checkOwnedCoreProgram([proxy],context),/non-data/u);assert.equal(touched,0);
 keep('complete-native-fallback-observations',{data,program,outcomes,touched});
});

test('bounded saturation reconstructs instead of rejecting and document bounds remain incremental',async(_t,keep)=>{
 const pairs=await copies(keep),data=files(2),context=pairs.sourceAPI.createOwnedCoreSourceContext(data),program=selected(pairs.current,context),outcomes=[];
 // Seeded scalar states isolate the exact real limits without claiming64
 // complete physical contexts ran here. Every body still uses genuine source.
 for(const [key,value]of [['initialGroups',64],['initialCells',100000],['initialUnits',16777216]]){
  pairs.current.probe[key]=value;reset(pairs.current);const result=pairs.current.api.checkOwnedCoreProgram(program,context);outcomes.push({key,value,result,analyses:pairs.current.probe.analyses.length});assert.deepEqual(result,program);assert.equal(pairs.current.probe.analyses.length,2);delete pairs.current.probe[key];
 }
 const meta=pairs.document.serializeOwnedCoreDocument(program,{context}),roundtrip=pairs.document.readOwnedCoreDocument(meta,{context});assert.deepEqual(roundtrip,program);
 const rows=pairs.sourceAPI.ownedCoreSourceData(context),changed={...rows,files:rows.files.map(row=>({...row}))};changed.files.push({path:'near-bound.txt',source:''});
 const header={profile:'router-owned-core-source-document-v1',context:changed},emptyBytes=writeLink(['owned-source-document',encodeWord(JSON.stringify(header))]).length+1,padding=Math.floor((33554432-emptyBytes-16)/8);assert.ok(padding>0);changed.files.at(-1).source='\0'.repeat(padding);
 const near=pairs.sourceAPI.createOwnedCoreSourceContext(changed),many=Array(4096).fill(program[0]);many[4095]={kind:'invalid-late-item'};
 const bounded=failure(()=>pairs.document.serializeOwnedCoreDocument(many,{context:near}));keep('complete-early-bound-outcome',{changed,padding,emptyBytes,bounded});assert.equal(bounded.failed,true);assert.match(bounded.message,/encoded document byte bound/u);
 // Real complete sources, rather than seeded counters, exceed the aggregate
 // retained-string bound while each requested row still fits its old domain.
 const largeData=files(32,'//'+'x'.repeat(300000)+'\n'),largeContext=pairs.sourceAPI.createOwnedCoreSourceContext(largeData),largeProgram=selected(pairs.current,largeContext);reset(pairs.current);
 const large=pairs.current.api.checkOwnedCoreProgram([largeProgram[0],largeProgram[1]],largeContext);keep('complete-actual-retained-unit-saturation',{largeData,largeProgram,large,analyses:pairs.current.probe.analyses.length});assert.deepEqual(large,[largeProgram[0],largeProgram[1]]);assert.equal(pairs.current.probe.analyses.length,3);
 // A genuine expression can fit the old item depth while the complete retained
 // analysis adds two envelope edges. This checks depth saturation without
 // widening either the existing expression or own-data admission boundary.
 const depthData=files(1),deepJS=imports+'export function deep(value,flag){const stored=copy(value);return '+'!'.repeat(155)+'flag;}',deepTS=imports+types+'export function deep(value:JsonValue,flag:boolean):boolean{const stored=copy(value);return '+'!'.repeat(155)+'flag;}';
 depthData.files.find(row=>row.path==='caller.mjs').source=deepJS;depthData.files.find(row=>row.path==='caller.mts').source=deepTS;
 const depthContext=pairs.sourceAPI.createOwnedCoreSourceContext(depthData),depthAnalysis=pairs.current.api.analyzeOwnedCoreModule(depthContext,'caller.mjs'),depthProgram=depthAnalysis.program;
 const height=value=>value===null||typeof value!=='object'?0:1+Math.max(0,...Object.values(value).map(height));
 keep('complete-depth-source-and-analysis',{depthData,depthAnalysis,itemHeight:height(depthProgram[0]),analysisHeight:height(depthAnalysis)});assert.equal(depthProgram.length,1);assert.ok(height(depthProgram[0])<=160);assert.ok(height(depthAnalysis)>160);reset(pairs.current);
 const depthRows=pairs.current.api.withOwnedCoreItemChecks(check=>[check(depthProgram[0],depthContext),check(depthProgram[0],depthContext)]);keep('complete-depth-storage-fallback',{depthRows,analyses:pairs.current.probe.analyses.length});assert.deepEqual(depthRows,[depthProgram[0],depthProgram[0]]);assert.equal(pairs.current.probe.analyses.length,3);
 // A fresh second call has no previous successful analysis record.
 reset(pairs.current);pairs.current.api.checkOwnedCoreProgram(program,context);pairs.current.api.checkOwnedCoreProgram(program,context);assert.equal(pairs.current.probe.analyses.length,2);
 keep('complete-storage-and-document-boundaries',{data,program,outcomes,meta,roundtrip,changed});
});
