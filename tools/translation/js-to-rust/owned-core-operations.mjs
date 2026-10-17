// Checked owned-core operations, separate from the legacy portable profile.
// The body is always reconstructed from the current complete original source.
import {isDeepStrictEqual,types} from 'node:util';
import {posix} from 'node:path';
import {originalOwnedCoreModule,originalOwnedCoreImport,originalOwnedCoreType,requireOwnedCoreSourceCurrent,ownedPlainData,ownedCoreSourceData} from './owned-core-source.mjs';
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
 const analysis=originalOwnedCoreModule(context,path),{ts,file,source}=analysis,program=[],diagnostics=[],items=[];
 const functions=file.statements.filter(ts.isFunctionDeclaration);
 // Top-level evaluation, namespace imports and unsupported exports are not
 // silently erased. Their full source remains in the refusal manifest.
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('only actual named imports');
   for(const spec of item.importClause.namedBindings.elements)originalOwnedCoreImport(context,path,spec.name,analysis);continue;
  }
  if(ts.isFunctionDeclaration(item))continue;
  if(ts.isEmptyStatement(item))continue;
  fail('top-level evaluation or unsupported declaration');
 }
 for(const declaration of functions){
  const span=[declaration.getStart(file),declaration.end],name=declaration.name?.text??null;
  try{const item=checkFunction(context,path,declaration,analysis);program.push(item);items.push({name,span,status:'translated'});}
  catch(error){if(!(error instanceof TypeError))throw error;const diagnostic={kind:'owned-core',name,span,message:error.message};diagnostics.push(diagnostic);items.push({name,span,status:'unsupported',diagnostic});}
 }
 requireOwnedCoreSourceCurrent(context);return {program,diagnostics,items,source,path};
}
function checkFunction(context,path,declaration,analysis){
 const {ts,file,source,checker}=analysis;
 if(!declaration.name||!declaration.body||declaration.asteriskToken||declaration.typeParameters||declaration.modifiers?.some(mod=>mod.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary original named function required');
 const name=rustName(declaration.name.text),params=[],environment=new Map();let cells=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('whole function flow budget');};
 function bind(identifier,value,scope){
  if(!ts.isIdentifier(identifier)||scope.has(identifier.text)||identifier.text.startsWith('__ro'))fail('duplicate, reserved or nonidentifier binding');
  const symbol=checker.getSymbolAtLocation(identifier);if(!symbol)fail('unresolved lexical declaration');scope.set(identifier.text,{...value,symbol});return identifier.text;
 }
 for(const param of declaration.parameters){
  if(param.dotDotDotToken||param.questionToken||param.initializer||param.modifiers?.length)fail('default/rest/optional parameter');
  const type=originalOwnedCoreType(context,path,param.type??ts.getJSDocType(param),analysis),identifier=param.name;
  const sourceName=bind(identifier,{type,root:['json-ref','map-ref','str'].includes(type)?identifier.text:null,input:true},environment);
  params.push({name:sourceName,rust:rustName(sourceName),type});
 }
 const hostCalls=[];
 function expression(node,scope,depth){
  tick(depth);if(ts.isParenthesizedExpression(node))return expression(node.expression,scope,depth+1);
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
   if(/\p{Surrogate}/u.test(node.text))fail('unpaired UTF16 string');return {kind:'string',value:node.text,type:'str',root:null};
  }
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool',root:null};
  if(ts.isBigIntLiteral(node)){
   const text=node.text.replace(/n$/u,'').replaceAll('_','');let value;try{value=BigInt(text);}catch{fail('invalid integer');}
   if(value<0n||value>18446744073709551615n)fail('u64 literal bound');return {kind:'integer',value:value.toString(),type:'usize',root:null};
  }
  if(ts.isIdentifier(node)){
   const value=scope.get(node.text);if(!value||checker.getSymbolAtLocation(node)!==value.symbol)fail('unknown, shadowed or moved binding');
   return {kind:'variable',name:node.text,type:value.type,root:value.root};
  }
  if(ts.isCallExpression(node)){
   if(node.questionDotToken||node.typeArguments?.length||node.arguments.some(ts.isSpreadElement))fail('optional/generic/spread call');
   const binding=originalOwnedCoreImport(context,path,node.expression,analysis),op=OPS[binding.name];
   const expected=analysis.runtimeRoot+'/'+(binding.name.startsWith('json_macro_')?'json-macro-runtime.mjs':'json-update-runtime.mjs');
   if(!op||binding.target!==expected)fail('unregistered source operation');
   const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
   if(args.length!==op.args.length||args.some((argument,index)=>!compatible(argument.type,op.args[index])))fail('owned argument type differs');
   // Shared index loans from temporaries cannot outlive their owner. No alias
   // or public source flag changes the actual root identity.
   const root=op.root===undefined?null:args[op.root].root;
   if(op.root!==undefined&&!root)fail('index requires a live input root');
   hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
   return {kind:'owned-call',name:binding.name,args,type:op.ret,root};
  }
  if(ts.isConditionalExpression(node)){
   const cond=expression(node.condition,scope,depth+1),yes=expression(node.whenTrue,scope,depth+1),no=expression(node.whenFalse,scope,depth+1);
   if(cond.type!=='bool'||yes.type!==no.type||yes.root!==no.root)fail('conditional result or loan differs');return {kind:'choose',cond,then:yes,else:no,type:yes.type,root:yes.root};
  }
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken){const value=expression(node.operand,scope,depth+1);if(value.type!=='bool')fail('boolean negation only');return {kind:'not',value,type:'bool',root:null};}
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)){
   const left=expression(node.left,scope,depth+1),right=expression(node.right,scope,depth+1),op=node.operatorToken.getText(file);
   if(['&&','||'].includes(op)?left.type!=='bool'||right.type!=='bool':!['bool','str','usize'].includes(left.type)||left.type!==right.type)fail('identity/coercion comparison outside owned profile');
   return {kind:'binary',op,left,right,type:'bool',root:null};
  }
  fail('unimplemented expression '+ts.SyntaxKind[node.kind]);
 }
 let resultType=null,resultRoot=null;
 function block(statements,scope,depth){
  const body=[];let terminated=false;
  for(const statement of statements){
   tick(depth);if(terminated)fail('statement after terminating return');
   if(ts.isVariableStatement(statement)){
    if(statement.modifiers?.length||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const)fail('only fresh immutable local declarations');
    for(const declaration of statement.declarationList.declarations){if(!declaration.initializer||declaration.exclamationToken||declaration.type)fail('unsupported local declaration');const value=expression(declaration.initializer,scope,depth+1),name=bind(declaration.name,{type:value.type,root:value.root},scope);body.push({kind:'let',name,value});}
   }else if(ts.isReturnStatement(statement)&&statement.expression){
    const value=expression(statement.expression,scope,depth+1);
    if(!['json','json-ref','bool','str','usize'].includes(value.type))fail('unsupported owned result');
    if(value.type==='json-ref'&&!params.some(param=>param.name===value.root&&['json-ref','map-ref'].includes(param.type)))fail('returned local loan');
    if(resultType!==null&&(resultType!==value.type||resultRoot!==value.root))fail('return domains differ');resultType=value.type;resultRoot=value.root;body.push({kind:'return',value});terminated=true;
   }else if(ts.isIfStatement(statement)&&ts.isBlock(statement.thenStatement)&&statement.elseStatement&&ts.isBlock(statement.elseStatement)){
    const cond=expression(statement.expression,scope,depth+1);if(cond.type!=='bool')fail('nonboolean condition');
    const yes=block(statement.thenStatement.statements,new Map(scope),depth+1),no=block(statement.elseStatement.statements,new Map(scope),depth+1);
    if(!yes.terminated||!no.terminated)fail('partial branch flow');body.push({kind:'if',cond,then:yes.body,else:no.body});terminated=true;
   }else fail('statement/effects outside owned profile');
  }
  return {body,terminated};
 }
 const checked=block(declaration.body.statements,environment,0);if(!checked.terminated)fail('missing return');
 if(!hostCalls.length)fail('no actual owned-core call');
 const item={kind:'owned-function',name,javascript:declaration.name.text,exported:!!declaration.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword),params,returns:resultType,resultRoot,body:checked.body,source:{path,source,span:[declaration.getStart(file),declaration.end]},hostCalls};
 requireOwnedCoreSourceCurrent(context);issued.set(item,{context});return item;
}
/** Reconstruct the exact original function; detached or edited items refuse. */
export function checkOwnedCoreItem(item,context=issued.get(item)?.context){
 if(!context)fail('unissued function');const input=ownedPlainData(item),analysis=originalOwnedCoreModule(context,input.source.path),{ts,file,source}=analysis;
 if(source!==input.source.source)fail('complete caller source differs');
 const candidates=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.getStart(file)===input.source.span[0]&&node.end===input.source.span[1]);
 if(candidates.length!==1)fail('original function span differs');const result=checkFunction(context,input.source.path,candidates[0],analysis);
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
 function expr(value){
  switch(value.kind){
   case 'variable':return rust?rustName(value.name):value.name;
   case 'string':return rust?rustString(value.value):JSON.stringify(value.value);
   case 'bool':return String(value.value);
   case 'integer':return rust?value.value+'_u64':value.value+'n';
   case 'not':return '(!'+expr(value.value)+')';
   case 'binary':return '('+expr(value.left)+' '+(rust?({'===':'==','!==':'!='}[value.op]??value.op):value.op)+' '+expr(value.right)+')';
   case 'choose':return rust?'(if '+expr(value.cond)+' { '+expr(value.then)+' } else { '+expr(value.else)+' })':'('+expr(value.cond)+' ? '+expr(value.then)+' : '+expr(value.else)+')';
   case 'owned-call':{
    const op=OPS[value.name];imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+value.args.map(expr).join(', ')+')';
    const names=value.args.map(()=> '__ro_arg_'+sequence++),lines=value.args.map((argument,index)=>'let '+names[index]+' = '+expr(argument)+';');
    const args=value.args.map((argument,index)=>json(argument.type)&&argument.type==='json'?'&'+names[index]:names[index]);
    let call;
    if(value.name==='json_macro_null')call='::serde_json::Value::Null';
    else if(value.name==='json_macro_bool')call='::serde_json::Value::Bool('+args[0]+')';
    else if(value.name==='json_macro_string')call='::serde_json::Value::String('+args[0]+'.to_owned())';
    else if(value.name==='json_macro_u64')call='::serde_json::Value::from('+args[0]+')';
    else if(value.name==='json_macro_i64')call='::serde_json::Value::from(i64::try_from('+args[0]+').expect("owned reverse i64 bound"))';
    else if(op.rust==='json_copy')call='__ro_copy('+args.join(', ')+')';
    else if(op.rust==='json_with_field')call='__ro_with_field('+args.join(', ')+')';
    else if(op.rust==='json_index_usize')call='crate::translation_core::json_index_usize('+args[0]+', usize::try_from('+args[1]+').expect("owned reverse usize bound"))';
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
