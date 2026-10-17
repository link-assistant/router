// Checked owned-core operations, separate from the legacy portable profile.
// The body is always reconstructed from the current complete original source.
import {isDeepStrictEqual,types} from 'node:util';
import {posix} from 'node:path';
import {analyzeOriginalOwnedCoreSource,requireOwnedCoreSourceCurrent,ownedPlainData,ownedCoreSourceData} from './owned-core-source.mjs';
const issued=new WeakMap(),runtimes=new WeakMap();
const fail=message=>{throw new TypeError('Owned reverse operation: '+message);};
const OPS=Object.freeze({
 router_core_json_copy:{args:['json'],ret:'json',rust:'json_copy'},
 router_core_json_with_field:{args:['json','str','json'],ret:'json',rust:'json_with_field'},
 router_core_json_index_str:{args:['json','str'],ret:'json-ref',rust:'json_index_str',root:0},
 router_core_json_index_usize:{args:['json','usize'],ret:'json-ref',rust:'json_index_usize',root:0},
 router_core_json_map_index:{args:['map-ref','str'],ret:'json-ref',rust:'json_map_index',root:0},
 json_macro_value:{args:['json'],ret:'json',rust:'json_copy'},
 json_macro_null:{args:[],ret:'json',rust:null},
 json_macro_bool:{args:['bool'],ret:'json',rust:null},
 json_macro_string:{args:['str'],ret:'json',rust:null},
 json_macro_u64:{args:['u64'],ret:'json',rust:null},
 json_macro_i64:{args:['i64'],ret:'json',rust:null},
});
const KEYS=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield'.split(' '));
function rustName(name){
 if(!/^[a-z][A-Za-z0-9]*$/u.test(name)||KEYS.has(name))fail('nonportable declaration name');
 const rust=name.replace(/[A-Z]/gu,c=>'_'+c.toLowerCase());if(KEYS.has(rust))fail('reserved declaration name');return rust;
}
const json=type=>type==='json'||type==='json-ref';
const compatible=(actual,wanted)=>wanted==='json'?json(actual):wanted==='i64'?actual==='i64'||actual==='usize':wanted==='u64'?actual==='usize':actual===wanted;
/** Only a private original check can create an executable item. */
export const isOwnedCoreItem=item=>!!item&&typeof item==='object'&&!types.isProxy(item)&&Object.getOwnPropertyDescriptor(item,'kind')?.value==='owned-function';
export function analyzeOwnedCoreModule(context,path){
 const result=analyzeOriginalOwnedCoreSource(context,path);
 for(const item of result.program)issued.set(item,{context});
 return result;
}
/** Reconstruct the exact original function; detached or edited items refuse. */
export function checkOwnedCoreItem(item,context=issued.get(item)?.context){
 if(!context)fail('unissued function');const input=ownedPlainData(item),analysis=analyzeOwnedCoreModule(context,input.source.path);
 if(analysis.source!==input.source.source)fail('complete caller source differs');
 const candidates=analysis.program.filter(value=>value.source.span[0]===input.source.span[0]&&value.source.span[1]===input.source.span[1]);
 if(candidates.length!==1)fail('original function span or checked domain differs');const result=candidates[0];
 if(!isDeepStrictEqual(result,input))fail('checked function/meta differs');return result;
}
export function checkOwnedCoreProgram(program,context){
 if(!Array.isArray(program)||program.length>4096)fail('invalid program');const names=new Set();return program.map(item=>{const result=checkOwnedCoreItem(item,context);if(names.has(result.name))fail('duplicate function');names.add(result.name);return result;});
}
export function ownedCoreContext(item){return issued.get(checkOwnedCoreItem(item))?.context;}
const rustString=value=>'"'+value.replace(/[\\"\x00-\x1f\x7f]/gu,c=>({'\\':'\\\\','"':'\\"','\n':'\\n','\r':'\\r','\t':'\\t'}[c]??'\\u{'+c.codePointAt(0).toString(16)+'}'))+'"';
const TS_TYPES={json:'JsonValue','json-ref':'JsonValue','map-ref':"Extract<JsonValue,{readonly $:'Object'}>['field0']",str:'string',bool:'boolean',usize:'bigint'};
const RUST_TYPES={json:'crate::translation_core::Json','json-ref':"&'a crate::translation_core::Json",'map-ref':"&'a ::serde_json::Map<::std::string::String,crate::translation_core::Json>",str:"&'a str",bool:'bool',usize:'u64'};
export function emitOwnedCoreProgram(input,target,{outputPath}={}){
 const program=checkOwnedCoreProgram(input),rust=target==='rust';if(!rust&&target!=='typescript')fail('unknown target');if(!program.length)return '';
 const context=issued.get(program[0]).context;requireOwnedCoreSourceCurrent(context);const sourceData=ownedCoreSourceData(context);
 if(program.some(item=>issued.get(item).context!==context))fail('mixed receiving contexts');
 let sequence=0;const imports=new Set();
 function expr(value,borrowOwned=false){
  switch(value.kind){
   case 'variable':return rust?(value.type==='json'?(borrowOwned?'&'+rustName(value.name):'__ro_copy(&'+rustName(value.name)+')'):rustName(value.name)):value.name;
   case 'string':return rust?rustString(value.value):JSON.stringify(value.value);
   case 'bool':return String(value.value);
   case 'integer':return rust?value.value+'_u64':value.value+'n';
   case 'not':return '(!'+expr(value.value)+')';
   case 'binary':return '('+expr(value.left)+' '+(rust?({'===':'==','!==':'!='}[value.op]??value.op):value.op)+' '+expr(value.right)+')';
   case 'choose':return rust?'(if '+expr(value.cond)+' { '+expr(value.then)+' } else { '+expr(value.else)+' })':'('+expr(value.cond)+' ? '+expr(value.then)+' : '+expr(value.else)+')';
   case 'owned-call':{
    const op=OPS[value.name];imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+value.args.map(expr).join(', ')+')';
    const names=value.args.map(()=> '__ro_arg_'+sequence++),lines=value.args.map((argument,index)=>{
     const source=argument.type==='json'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument);
     return 'let '+names[index]+' = '+source+';';
    });
    // All source arguments are bound in order. Owned local variables are
    // borrowed here; compensating copies happen only inside the fixed call.
    const args=names;
    let call;
    if(value.name==='json_macro_null')call='::serde_json::Value::Null';
    else if(value.name==='json_macro_bool')call='::serde_json::Value::Bool('+args[0]+')';
    else if(value.name==='json_macro_string')call='::serde_json::Value::String('+args[0]+'.to_owned())';
    else if(value.name==='json_macro_u64')call='::serde_json::Value::from('+args[0]+')';
    else if(value.name==='json_macro_i64')call='::serde_json::Value::from(i64::try_from('+args[0]+').expect("owned reverse i64 bound"))';
    else if(op.rust==='json_copy')call='__ro_copy('+args.join(', ')+')';
    else if(op.rust==='json_with_field')call='__ro_with_field('+args.join(', ')+')';
    else if(op.rust==='json_index_usize')call='match usize::try_from('+args[1]+') { Ok(index) => crate::translation_core::json_index_usize('+args[0]+', index), Err(_) => &::serde_json::Value::Null }';
    else call='crate::translation_core::'+op.rust+'('+args.join(', ')+')';
    return '{ '+lines.join(' ')+' '+call+' }';
   }
   default:fail('unissued expression kind');
  }
 }
 function body(statements,indent){return statements.map(statement=>{
  const pad=' '.repeat(indent);
  if(statement.kind==='let')return pad+(rust?'let ':'const ')+(rust?rustName(statement.name):statement.name)+' = '+expr(statement.value)+';';
  if(statement.kind==='return')return pad+'return '+expr(statement.value)+';';
  return pad+'if '+(rust?'':'(')+expr(statement.cond)+(rust?'':')')+' {\n'+body(statement.then,indent+4)+'\n'+pad+'} else {\n'+body(statement.else,indent+4)+'\n'+pad+'}';
 }).join('\n');}
 const code=program.map(item=>{
  const borrowed=type=>['json-ref','map-ref','str'].includes(type),loan=borrowed(item.returns),explicit=loan&&item.resultRoot!==null&&item.params.filter(param=>borrowed(param.type)).length>1;
  const parameters=item.params.map(param=>{
   const type=rust?RUST_TYPES[param.type].replace("'a ",explicit&&param.name===item.resultRoot?"'a ":''):TS_TYPES[param.type];
   return (rust?param.rust:param.name)+': '+type;
  }).join(', ');
  const returns=rust?RUST_TYPES[item.returns].replace("'a ",item.resultRoot===null?"'static ":explicit?"'a ":''):TS_TYPES[item.returns];
  const signature=rust?'#[must_use]\n#[rustfmt::skip]\n'+(item.exported?'pub ':'')+'fn '+item.name+(explicit?"<'a>":'')+'(':(item.exported?'export ':'')+'function '+item.javascript+'(';
  return signature+parameters+')'+(rust?' -> ':': ')+returns+' {\n'+body(item.body,4)+'\n}';
 }).join('\n\n');
 requireOwnedCoreSourceCurrent(context);
 if(rust)return RUST_SUPPORT+'\n\n'+code+'\n';
 const output=outputPath??program[0].source.path,relative=name=>{const path=posix.relative(posix.dirname(output),sourceData.runtimeRoot+'/'+name);return path.startsWith('.')?path:'./'+path;};
 const lines=['import type {JsonValue} from '+JSON.stringify(relative('json-macro-runtime.mjs'))+';'];
 for(const family of ['json-update','json-macro']){
  const names=[...imports].filter(name=>(name.startsWith('json_macro_')?'json-macro':'json-update')===family);
  if(names.length)lines.push('import { '+names.map(name=>name+' as __ro_'+name).join(', ')+' } from '+JSON.stringify(relative(family+'-runtime.mjs'))+';');
 }
 return lines.join('\n')+'\n\n'+code+'\n';
}
// Matching the canonical successful-resource envelope is part of this NEW
// profile. Native panics are not advertised as catchable JavaScript Errors.
export const RUST_SUPPORT=`#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_domain(value: &crate::translation_core::Json) {
    fn visit(value: &crate::translation_core::Json, depth: usize, nodes: &mut usize) {
        *nodes += 1;
        assert!(*nodes <= 4096 && depth <= 32, "owned reverse JSON budget");
        match value {
            ::serde_json::Value::Array(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items { visit(item, depth + 1, nodes); }
            }
            ::serde_json::Value::Object(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items.values() { visit(item, depth + 1, nodes); }
            }
            _ => {}
        }
    }
    visit(value, 0, &mut 0);
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_copy(value: &crate::translation_core::Json) -> crate::translation_core::Json {
    __ro_domain(value);
    crate::translation_core::json_copy(value)
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_with_field(base: &crate::translation_core::Json, key: &str, value: &crate::translation_core::Json) -> crate::translation_core::Json {
    let base = __ro_copy(base);
    let value = __ro_copy(value);
    assert!(base.is_null() || base.is_object(), "Owned JSON string-key update requires an object or null");
    let result = crate::translation_core::json_with_field(base, key, value);
    __ro_domain(&result);
    result
}`;
/** Prepare only the actual registered module, after fresh complete source joins. */
export async function prepareOwnedCoreRuntime(input){
 const program=checkOwnedCoreProgram(input),modules={update:await import('../json-update-runtime.mjs'),macro:await import('../json-macro-runtime.mjs')};
 checkOwnedCoreProgram(program);const token=Object.freeze({schema:'owned-core-runtime-v1'});runtimes.set(token,{program,modules});return token;
}
export function evaluateOwnedCoreProgram(input,name,args,token){
 const program=checkOwnedCoreProgram(input),state=runtimes.get(token);if(!state||!isDeepStrictEqual(state.program,program))fail('unissued runtime/program');
 const item=program.find(item=>item.name===name||item.javascript===name);if(!item||!Array.isArray(args)||args.length!==item.params.length)fail('actual arguments differ');
 const env=new Map(item.params.map((param,index)=>[param.name,args[index]]));
 const get=(value,scope)=>{
  switch(value.kind){
   case 'variable':return scope.get(value.name);
   case 'string':case 'bool':return value.value;
   case 'integer':return BigInt(value.value);
   case 'not':return !get(value.value,scope);
   case 'choose':return get(value.cond,scope)?get(value.then,scope):get(value.else,scope);
   case 'binary':{const left=get(value.left,scope);if(value.op==='&&')return left&&get(value.right,scope);if(value.op==='||')return left||get(value.right,scope);const right=get(value.right,scope);return value.op==='==='?left===right:left!==right;}
   case 'owned-call':{const module=value.name.startsWith('json_macro_')?state.modules.macro:state.modules.update;return Reflect.apply(module[value.name],undefined,value.args.map(value=>get(value,scope)));}
   default:fail('unknown evaluated expression');
  }
 };
 const run=(body,scope)=>{for(const statement of body){if(statement.kind==='let')scope.set(statement.name,get(statement.value,scope));else if(statement.kind==='return')return get(statement.value,scope);else return run(get(statement.cond,scope)?statement.then:statement.else,new Map(scope));}fail('no return');};
 return run(item.body,env);
}
