// Bounded source -> serializable integer/loop IR -> mathematical projection.
// This is not macro/type owner resolution or an application execution contract.
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const seals=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex'),word=node=>node?.kind==='token'?node.text:null;
const precedence={'||':1,'&&':2,'==':3,'!=':3,'<':4,'<=':4,'>':4,'>=':4,'|':5,'&':6,'<<':7,'>>':7,'+':8,'-':8,'*':9};
function shifts(nodes){const result=[];for(let i=0;i<nodes.length;i++){const node=nodes[i];if(word(node)==='>'&&word(nodes[i+1])==='>'&&node.span.end===nodes[i+1].span.start){result.push({...node,text:'>>',span:{start:node.span.start,end:nodes[++i].span.end}});}else result.push(node);}return result;}
const split=(nodes,separator)=>{const result=[];let start=0;for(let i=0;i<=nodes.length;i++)if(i===nodes.length||word(nodes[i])===separator){result.push(nodes.slice(start,i));start=i+1;}return result.filter(part=>part.length);};
class Parser {
  constructor(nodes){this.nodes=shifts(nodes);this.at=0;}
  take(value){if(word(this.nodes[this.at])===value){this.at++;return true;}return false;}
  need(value){if(!this.take(value))throw new TypeError('Arithmetic source requires '+value);}
  group(delimiter){const node=this.nodes[this.at++];if(node?.kind!=='group'||node.delimiter!==delimiter)throw new TypeError('Unproved arithmetic source delimiter');return node;}
  rest(){return this.nodes.slice(this.at);}
  expression(min=0){
    let left=this.primary();
    for(;;){const op=word(this.nodes[this.at]),level=precedence[op];if(level===undefined||level<min)break;this.at++;left={kind:'binary',op,left,right:this.expression(level+1)};}
    return left;
  }
  primary(){
    let value;const node=this.nodes[this.at++],raw=word(node);
    if(raw==='*'||raw==='&'){const mutable=raw==='&'&&this.take('mut');value={kind:raw==='*'?'deref':'borrow',mutable,value:this.primary()};}
    else if(node?.kind==='group'&&node.delimiter==='('){const parts=split(node.children,',');value=parts.length===1?parseExpression(parts[0]):{kind:'tuple',items:parts.map(parseExpression)};}
    else if(raw==='match'){
      const subject=this.expression(),body=this.group('{'),arms=split(body.children,',').map(tokens=>{const at=tokens.findIndex(token=>word(token)==='=>');if(at!==1||!(word(tokens[0])==='_'||/^\d+$/u.test(word(tokens[0])??'')))throw new TypeError('Arithmetic match needs literal/wildcard arms');return {pattern:word(tokens[0]),value:parseExpression(tokens.slice(at+1))};});
      if(!arms.length||arms.at(-1).pattern!=='_'||arms.slice(0,-1).some(arm=>arm.pattern==='_'))throw new TypeError('Arithmetic match must have a final wildcard');value={kind:'match',subject,arms};
    } else if(raw==='true'||raw==='false')value={kind:'bool',value:raw==='true'};
    else if(/^\d+$/u.test(raw??''))value={kind:'literal',value:raw};
    else if(/^[A-Za-z_][A-Za-z0-9_]*$/u.test(raw??'')){
      const path=[raw];while(this.take('::')){if(this.take('<')){const type=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(type??''))throw new TypeError('Arithmetic type argument is unproved');this.need('>');value={kind:'typeCall',path,type};break;}const name=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''))throw new TypeError('Arithmetic source path unproved');path.push(name);}
      value??={kind:'name',path};
    }else throw new TypeError('Unproved arithmetic expression token '+raw);
    for(;;){
      if(this.nodes[this.at]?.delimiter==='('){const group=this.group('('),args=split(group.children,',').map(parseExpression);value={kind:'call',callee:value,args};}
      else if(this.take('.')){const name=word(this.nodes[this.at++]);if(/^\d+$/u.test(name??''))value={kind:'field',object:value,index:Number(name)};else if(/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??'')){const args=split(this.group('(').children,',').map(parseExpression);value={kind:'method',object:value,name,args};}else throw new TypeError('Arithmetic field/method unproved');}
      else break;
    }
    return value;
  }
  block(){const statements=[];let tail={kind:'tuple',items:[]};while(this.at<this.nodes.length){
    if(this.take('let')){const mutable=this.take('mut'),name=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''))throw new TypeError('Arithmetic binder needs actual simple identifier');let type=null;if(this.take(':')){type=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(type??''))throw new TypeError('Arithmetic local type unproved');}this.need('=');const value=this.expression();this.need(';');statements.push({kind:'let',name,mutable,type,value});}
    else if(this.take('for')){const name=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''))throw new TypeError('Arithmetic loop binder unproved');this.need('in');const iterable=this.expression(),body=new Parser(this.group('{').children).block();statements.push({kind:'for',name,iterable,body});}
    else if(this.take('if')){const condition=this.expression(),body=new Parser(this.group('{').children).block();if(this.take('else'))throw new TypeError('Arithmetic statement else requires a separate profile');statements.push({kind:'if',condition,body});}
    else if(word(this.nodes[this.at])==='debug_assert'&&word(this.nodes[this.at+1])==='!'){this.at+=2;const condition=parseExpression(this.group('(').children);this.need(';');statements.push({kind:'precondition',condition,unresolvedOwner:'debug_assert!'});}
    else{const value=this.expression();if(this.take('=')){const right=this.expression();this.need(';');statements.push({kind:'assign',left:value,right});}else if(this.take(';'))statements.push({kind:'expression',value});else{tail=value;if(this.at!==this.nodes.length)throw new TypeError('Arithmetic tail leaves original tokens');}}
  }return {statements,tail};}
}
function parseExpression(nodes){const parser=new Parser(nodes),value=parser.expression();if(parser.at!==parser.nodes.length)throw new TypeError('Arithmetic expression leaves original tokens');return value;}
function type(nodes){const words=nodes.map(word);if(words.some(value=>value===null))throw new TypeError('Arithmetic parameter type group unproved');if(words.length===1&&/^(?:u32|u64|u128|Limb|Wide)$/u.test(words[0]))return {kind:'uint',source:words[0]};if(words[0]==='&'&&words[1]==='mut'){if(words.length===3)return {kind:'ref',inner:type(nodes.slice(2))};if(words.join(' ')==='& mut Vec < Limb >')return {kind:'ref',inner:{kind:'vector',element:{kind:'uint',source:'Limb'}}};}throw new TypeError('Arithmetic parameter type unsupported');}
function extract(nodes,source,path=[],result=new Map()){
  for(let i=0;i<nodes.length;i++){
    if(word(nodes[i])==='mod'&&nodes[i+2]?.delimiter==='{'){extract(nodes[i+2].children,source,[...path,word(nodes[i+1])],result);i+=2;continue;}
    if(word(nodes[i])!=='fn'||nodes[i+2]?.delimiter!=='(')continue;
    let end=i+3;while(end<nodes.length&&nodes[end]?.delimiter!=='{'&&word(nodes[end])!==';')end++;if(nodes[end]?.delimiter!=='{')continue;
    const parameterTokens=nodes[i+2].children;
    const span={start:nodes[i].span.start,end:nodes[end].span.end},name=[...path,word(nodes[i+1])].join('::');
    // Only selected bodies are parsed later; unrelated syntax is not certified.
    result.set(name,{name,path,parameterTokens,bodyTokens:nodes[end].children,span,sha256:hash(source.slice(span.start,span.end)),bodySpan:nodes[end].span});i=end;
  }return result;
}
export function compileArithmeticSourceFragments(source,paths){
  if(!Array.isArray(paths)||paths.length>32||new Set(paths).size!==paths.length||paths.some(path=>typeof path!=='string'))throw new TypeError('Arithmetic source selection is invalid');
  const declarations=extract(originalMacroTrees(source),source),functions=[];
  for(const name of paths){const declaration=declarations.get(name);if(!declaration)throw new TypeError('Actual arithmetic function absent: '+name);const {bodyTokens,parameterTokens,...evidence}=declaration;const params=split(parameterTokens,',').map(tokens=>{if(word(tokens[1])!==':'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(word(tokens[0])??''))throw new TypeError('Arithmetic source parameter binder unproved');return {name:word(tokens[0]),type:type(tokens.slice(2))};});functions.push({...evidence,params,ir:new Parser(bodyTokens).block()});}
  const program=freezeMacroTree({schema:'source-integer-loop-fragments-v1',sourceSha256:hash(source),functions,projectionOnly:true,sourceAssumptions:['fixed unsigned primitive arithmetic with checked nonoverflow additions/products','as_limb/as_wide are arithmetic cast models, not resolved trait owner claims','source debug_assert conditions are domain preconditions; macro owner remains unknown','private temporary reference cells model only selected nonescaping arithmetic'],sourceOwnerVerified:false,macroOwnerVerified:false,sourceBehaviorFidelityVerified:false,parseAdmission:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});seals.add(program);return program;
}
export const isArithmeticSourceFragments=value=>!!value&&seals.has(value);
const uint=(value,bits)=>{if(typeof value!=='bigint'||value<0n||value>=(1n<<BigInt(bits)))throw new RangeError('Arithmetic model unsigned bound');return {kind:'uint',value,bits};};
const bool=value=>({kind:'bool',value}),tuple=items=>({kind:'tuple',items}),literal=value=>({kind:'literal',value:BigInt(value)});
const deref=value=>value?.kind==='ref'?value.get():value;
function actual(value){value=deref(value);if(!['uint','literal','bool'].includes(value?.kind))throw new TypeError('Arithmetic scalar required');return value.value;}
function promoted(value,other){value=deref(value);return value.kind==='literal'&&other?.kind==='uint'?uint(value.value,other.bits):value;}
export function projectArithmeticSource(program,path,input,{limbBits=32,stepBudget=100000}={}){
  if(!isArithmeticSourceFragments(program)||![32,64].includes(limbBits)||!Number.isSafeInteger(stepBudget)||stepBudget<=0||stepBudget>1000000)throw new TypeError('Arithmetic projection requires private source program and bounded32/64 model');
  const definitions=new Map(program.functions.map(fn=>[fn.name,fn])),mutations=[],types={Limb:limbBits,Wide:limbBits*2,u32:32,u64:64,u128:128};let steps=0;
  const step=()=>{if(++steps>stepBudget)throw new RangeError('Arithmetic projection step bound');};
  const cast=(value,name)=>{if(!types[name])throw new TypeError('Arithmetic alias is unproved');return uint(actual(value)&((1n<<BigInt(types[name]))-1n),types[name]);};
  function cell(value){let current=value;return {kind:'ref',get:()=>current,set:value=>{current=value;}};}
  function bind(value,type){if(type.kind==='uint')return uint(value,types[type.source]);if(type.kind==='ref'){if(type.inner.kind==='uint'){const ref=cell(bind(value,type.inner));mutations.push(ref);return ref;}if(type.inner.kind==='vector'){if(utilTypes.isProxy(value)||!Array.isArray(value)||value.length>128||Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError('Arithmetic source vector domain');const descriptors=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(descriptors).length!==value.length+1)throw new TypeError('Arithmetic source vector has extra fields');const items=[];for(let i=0;i<value.length;i++){const descriptor=descriptors[i];if(!descriptor||!('value'in descriptor))throw new TypeError('Arithmetic source vector needs own scalar data');items.push(cell(uint(descriptor.value,limbBits)));}const ref=cell({kind:'vector',items});mutations.push(ref);return ref;}}throw new TypeError('Arithmetic source binding unsupported');}
  function expression(node,env,scope){step();switch(node.kind){
    case'literal':return literal(node.value);case'bool':return bool(node.value);case'name':{if(node.path.length!==1||!env.has(node.path[0]))throw new TypeError('Arithmetic source value binding unresolved');return env.get(node.path[0]);}
    case'deref':return deref(expression(node.value,env,scope));case'borrow':{if(node.value.kind==='deref')return expression(node.value.value,env,scope);throw new TypeError('Arithmetic source borrowing unsupported');}
    case'tuple':return tuple(node.items.map(value=>expression(value,env,scope)));case'field':{const object=deref(expression(node.object,env,scope));if(object.kind!=='tuple'||node.index>=object.items.length)throw new TypeError('Arithmetic tuple projection unproved');return object.items[node.index];}
    case'method':{const object=deref(expression(node.object,env,scope)),args=node.args.map(value=>expression(value,env,scope));if(node.name==='leading_zeros'&&!args.length&&object.kind==='uint')return uint(BigInt(object.value===0n?object.bits:object.bits-object.value.toString(2).length),32);if(node.name==='push'&&args.length===1&&object.kind==='vector'){if(object.items.length>=128)throw new RangeError('Arithmetic vector bound');object.items.push(cell(cast(args[0],'Limb')));return tuple([]);}throw new TypeError('Arithmetic method has no checked model');}
    case'call':{const args=node.args.map(value=>expression(value,env,scope));if(node.callee.kind==='typeCall'&&node.callee.path.join('::')==='mem::size_of'&&!args.length&&types[node.callee.type])return uint(BigInt(types[node.callee.type]/8),32);if(node.callee.kind!=='name')throw new TypeError('Arithmetic callable unresolved');const name=node.callee.path.join('::');if(['as_wide','as_limb'].includes(name)&&args.length===1)return cast(args[0],name==='as_wide'?'Wide':'Limb');const resolved=node.callee.path.length===1?[...scope,name].join('::'):name;return invoke(resolved,args);}
    case'match':{const value=actual(expression(node.subject,env,scope));const arm=node.arms.find(arm=>arm.pattern==='_'||BigInt(arm.pattern)===value);return expression(arm.value,env,scope);}
    case'binary':{let left=expression(node.left,env,scope);if(node.op==='&&'&&!actual(left))return bool(false);if(node.op==='||'&&actual(left))return bool(true);let right=expression(node.right,env,scope);left=promoted(left,deref(right));right=promoted(right,deref(left));const a=actual(left),b=actual(right);if(['==','!=','<','<=','>','>='].includes(node.op))return bool(node.op==='=='?a===b:node.op==='!='?a!==b:node.op==='<'?a<b:node.op==='<='?a<=b:node.op==='>'?a>b:a>=b);if(node.op==='&&'||node.op==='||')return bool(Boolean(b));left=deref(left);right=deref(right);const bits=left.kind==='uint'?left.bits:right.kind==='uint'?right.bits:null;if(!bits)throw new TypeError('Arithmetic integer context unproved');if(!['<<','>>'].includes(node.op)&&left.kind==='uint'&&right.kind==='uint'&&left.bits!==right.bits)throw new TypeError('Arithmetic primitive identities differ');let value;if(node.op==='+'||node.op==='-'||node.op==='*')value=node.op==='+'?a+b:node.op==='-'?a-b:a*b;else if(node.op==='<<'||node.op==='>>'){if(b<0n||b>=BigInt(bits))throw new RangeError('Arithmetic shift domain');value=node.op==='<<'?(a<<b)&((1n<<BigInt(bits))-1n):a>>b;}else value=node.op==='|'?a|b:a&b;return uint(value,bits);}
    default:throw new TypeError('Arithmetic source IR node unsupported');
  }}
  function block(ir,env,scope){for(const statement of ir.statements){step();if(statement.kind==='let'){let value=expression(statement.value,env,scope);if(statement.type){value=promoted(value,{kind:'uint',bits:types[statement.type]});if(value.kind!=='uint'||value.bits!==types[statement.type])throw new TypeError('Arithmetic annotated integer identity differs');}env.set(statement.name,value);}else if(statement.kind==='assign'){const value=expression(statement.right,env,scope),left=statement.left;if(left.kind==='name'){if(!env.has(left.path[0]))throw new TypeError('Arithmetic assignment binding unresolved');env.set(left.path[0],value);}else if(left.kind==='deref'){const ref=expression(left.value,env,scope);if(ref.kind!=='ref')throw new TypeError('Arithmetic source place unproved');ref.set(value);}else throw new TypeError('Arithmetic assignment place unproved');}else if(statement.kind==='expression')expression(statement.value,env,scope);else if(statement.kind==='precondition'){if(!actual(expression(statement.condition,env,scope)))throw new RangeError('Unresolved original assertion precondition');}else if(statement.kind==='if'){if(actual(expression(statement.condition,env,scope)))block(statement.body,new Map(env),scope);}else if(statement.kind==='for'){const iterable=deref(expression(statement.iterable,env,scope));if(iterable.kind!=='vector')throw new TypeError('Arithmetic loop source unproved');for(const value of iterable.items){const child=new Map(env);child.set(statement.name,value);block(statement.body,child,scope);for(const name of env.keys())if(child.has(name))env.set(name,child.get(name));}}else throw new TypeError('Arithmetic statement unsupported');}return expression(ir.tail,env,scope);}
  function invoke(name,args){step();const fn=definitions.get(name);if(!fn||args.length!==fn.params.length)throw new TypeError('Arithmetic source callable absent');return block(fn.ir,new Map(fn.params.map((param,index)=>[param.name,args[index]])),fn.path);}
  function output(value){value=deref(value);if(['uint','literal','bool'].includes(value.kind))return value.value;if(value.kind==='tuple')return value.items.map(output);if(value.kind==='vector')return value.items.map(output);throw new TypeError('Arithmetic projection output unproved');}
  const fn=definitions.get(path);if(!fn||utilTypes.isProxy(input)||!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length!==fn.params.length)throw new TypeError('Arithmetic source entry arguments invalid');const descriptors=Object.getOwnPropertyDescriptors(input);if(Reflect.ownKeys(descriptors).length!==input.length+1)throw new TypeError('Arithmetic arguments have extra fields');const args=fn.params.map((param,index)=>{const descriptor=descriptors[index];if(!descriptor||!('value'in descriptor))throw new TypeError('Arithmetic arguments need own data');return bind(descriptor.value,param.type);}),value=invoke(path,args);
  return freezeMacroTree({value:output(value),mutations:mutations.map(output),steps,projectionOnly:true,sourceBehaviorFidelityVerified:false,parseAdmission:false,applicationEffectCompleteness:false,runtimeParity:false});
}
