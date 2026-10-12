// Bounded source -> serializable integer/loop IR -> mathematical projection.
// This is not macro/type owner resolution or an application execution contract.
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const seals=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex'),word=node=>node?.kind==='token'?node.text:null;
const precedence={'||':1,'&&':2,'==':3,'!=':3,'<':4,'<=':4,'>':4,'>=':4,'|':5,'&':6,'<<':7,'>>':7,'+':8,'-':8,'*':9,'/':9};
function shifts(nodes){const result=[];for(let i=0;i<nodes.length;i++){const node=nodes[i];if((word(node)==='>'&&word(nodes[i+1])==='>'||word(node)==='.'&&word(nodes[i+1])==='.')&&node.span.end===nodes[i+1].span.start){result.push({...node,text:word(node)==='>'?'>>':'..',span:{start:node.span.start,end:nodes[++i].span.end}});}else result.push(node);}return result;}
const split=(nodes,separator)=>{if(!nodes.length)return [];const result=[];let start=0;for(let i=0;i<=nodes.length;i++)if(i===nodes.length||word(nodes[i])===separator){const part=nodes.slice(start,i);if(!part.length){if(i===nodes.length&&start===i)break;throw new TypeError('Arithmetic source has an empty separated element');}result.push(part);start=i+1;}return result;};
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
    if(raw==='!')value={kind:'not',value:this.primary()};
    else if(raw==='if'){this.at--;value=this.conditional();}
    else if(raw==='*'||raw==='&'){const mutable=raw==='&'&&this.take('mut');value={kind:raw==='*'?'deref':'borrow',mutable,value:this.primary()};}
    else if(node?.kind==='group'&&node.delimiter==='('){const parts=split(node.children,',');value=parts.length===1&&word(node.children.at(-1))!==','?parseExpression(parts[0]):{kind:'tuple',items:parts.map(parseExpression)};}
    else if(raw==='match'){
      const subject=this.expression(),body=this.group('{'),arms=split(body.children,',').map(tokens=>{const at=tokens.findIndex(token=>word(token)==='=>');if(at!==1||!(word(tokens[0])==='_'||/^\d+$/u.test(word(tokens[0])??'')))throw new TypeError('Arithmetic match needs literal/wildcard arms');return {pattern:word(tokens[0]),value:parseExpression(tokens.slice(at+1))};});
      if(!arms.length||arms.at(-1).pattern!=='_'||arms.slice(0,-1).some(arm=>arm.pattern==='_'))throw new TypeError('Arithmetic match must have a final wildcard');value={kind:'match',subject,arms};
    } else if(raw==='true'||raw==='false')value={kind:'bool',value:raw==='true'};
    else if(/^\d+$/u.test(raw??''))value={kind:'literal',value:raw};
    else if(/^[A-Za-z_][A-Za-z0-9_]*$/u.test(raw??'')){
      const path=[raw];while(this.take('::')){if(this.take('<')){const type=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(type??''))throw new TypeError('Arithmetic type argument is unproved');this.need('>');value={kind:'typeCall',path,type};continue;}const name=word(this.nodes[this.at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''))throw new TypeError('Arithmetic source path unproved');path.push(name);}
      value??={kind:'name',path};
    }else throw new TypeError('Unproved arithmetic expression token '+raw);
    for(;;){
      if(this.nodes[this.at]?.delimiter==='('){const group=this.group('('),args=split(group.children,',').map(parseExpression);value={kind:'call',callee:value,args};}
      else if(this.nodes[this.at]?.delimiter==='['){const group=this.group('['),children=shifts(group.children),at=children.findIndex(node=>word(node)==='..');value=at<0?{kind:'index',object:value,index:parseExpression(children)}:{kind:'slice',object:value,start:at?parseExpression(children.slice(0,at)):null,end:at+1<children.length?parseExpression(children.slice(at+1)):null};}
      else if(this.take('.')){const name=word(this.nodes[this.at++]);if(/^\d+$/u.test(name??''))value={kind:'field',object:value,index:Number(name)};else if(/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??'')){const args=split(this.group('(').children,',').map(parseExpression);value={kind:'method',object:value,name,args};}else throw new TypeError('Arithmetic field/method unproved');}
      else break;
    }
    return value;
  }
  conditional(){this.need('if');const condition=this.expression(),body=new Parser(this.group('{').children).block();let otherwise=null;if(this.take('else'))otherwise=word(this.nodes[this.at])==='if'?{statements:[],tail:this.conditional()}:new Parser(this.group('{').children).block();return {kind:'conditional',condition,body,otherwise};}
  block(){const statements=[];let tail={kind:'tuple',items:[]};while(this.at<this.nodes.length){
    if(this.take('let')){const mutable=this.take('mut'),pattern=bindingPattern(this.nodes[this.at++]);let annotation=null;if(this.take(':')){const nodes=[];while(this.at<this.nodes.length&&word(this.nodes[this.at])!=='=')nodes.push(this.nodes[this.at++]);annotation=type(nodes);}this.need('=');const value=this.expression();this.need(';');statements.push({kind:'let',pattern,mutable,annotation,value});}
    else if(this.take('for')){const pattern=bindingPattern(this.nodes[this.at++]);this.need('in');const iterable=this.expression(),body=new Parser(this.group('{').children).block();statements.push({kind:'for',pattern,iterable,body});}
    else if(word(this.nodes[this.at])==='if'){const value=this.conditional(),semicolon=this.take(';');if(this.at===this.nodes.length&&!semicolon)tail=value;else statements.push({kind:'expression',value});}
    else if(this.take('while')){const condition=this.expression(),body=new Parser(this.group('{').children).block();statements.push({kind:'while',condition,body});}
    else if(word(this.nodes[this.at])==='debug_assert'&&word(this.nodes[this.at+1])==='!'){this.at+=2;const condition=parseExpression(this.group('(').children);this.need(';');statements.push({kind:'precondition',condition,unresolvedOwner:'debug_assert!'});}
    else{const value=this.expression();if(this.take('=')){const right=this.expression();this.need(';');statements.push({kind:'assign',left:value,right});}else if(['+=','|='].includes(word(this.nodes[this.at]))){const op=word(this.nodes[this.at++]).slice(0,-1),right={kind:'binary',op,left:value,right:this.expression()};this.need(';');statements.push({kind:'assign',left:value,right});}else if(this.take(';'))statements.push({kind:'expression',value});else{tail=value;if(this.at!==this.nodes.length)throw new TypeError('Arithmetic tail leaves original tokens');}}
  }return {statements,tail};}
}
function parseExpression(nodes){const parser=new Parser(nodes),value=parser.expression();if(parser.at!==parser.nodes.length)throw new TypeError('Arithmetic expression leaves original tokens');return value;}
function bindingPattern(node){if(node?.kind==='group'&&node.delimiter==='(')return {kind:'tuple',items:split(node.children,',').map(part=>{if(word(part[0])==='&'&&part.length===2)return {kind:'copy',inner:bindingPattern(part[1])};if(part.length===1)return bindingPattern(part[0]);throw new TypeError('Arithmetic tuple loop binder unsupported');})};const name=word(node);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''))throw new TypeError('Arithmetic source loop binding unsupported');return {kind:'name',name};}
function type(nodes){if(word(nodes[0])==='&'){const mutable=word(nodes[1])==='mut',rest=nodes.slice(mutable?2:1);return {kind:'ref',mutable,inner:rest.length===1&&rest[0]?.delimiter==='['?{kind:'slice',element:type(rest[0].children)}:type(rest)};}const words=nodes.map(word);if(words.length===1&&/^(?:u32|u64|u128|usize|Limb|Wide)$/u.test(words[0]??''))return {kind:'uint',source:words[0]};if(words.join(' ')==='Vec < Limb >')return {kind:'vector',element:{kind:'uint',source:'Limb'}};throw new TypeError('Arithmetic parameter type unsupported');}
function scalarConstants(nodes,source,path=[],result=[]){for(let i=0;i<nodes.length;i++){if(word(nodes[i])==='mod'&&nodes[i+2]?.delimiter==='{'){scalarConstants(nodes[i+2].children,source,[...path,word(nodes[i+1])],result);i+=2;}else if(word(nodes[i])==='const'&&word(nodes[i+2])===':'&&/^(?:u32|u64|u128|usize)$/u.test(word(nodes[i+3])??'')&&word(nodes[i+4])==='='&&/^\d+$/u.test(word(nodes[i+5])??'')&&word(nodes[i+6])===';'){const span={start:nodes[i].span.start,end:nodes[i+6].span.end};result.push({name:[...path,word(nodes[i+1])].join('::'),type:word(nodes[i+3]),value:word(nodes[i+5]),span,sha256:hash(source.slice(span.start,span.end))});i+=6;}}return result;}
function extract(nodes,source,path=[],result=new Map()){
  for(let i=0;i<nodes.length;i++){
    if(word(nodes[i])==='mod'&&nodes[i+2]?.delimiter==='{'){extract(nodes[i+2].children,source,[...path,word(nodes[i+1])],result);i+=2;continue;}
    if(word(nodes[i])!=='fn'||nodes[i+2]?.delimiter!=='(')continue;
    let end=i+3;while(end<nodes.length&&nodes[end]?.delimiter!=='{'&&word(nodes[end])!==';')end++;if(nodes[end]?.delimiter!=='{')continue;
    const parameterTokens=nodes[i+2].children;
    const span={start:nodes[i].span.start,end:nodes[end].span.end},name=[...path,word(nodes[i+1])].join('::');
    // Only selected bodies are parsed later; unrelated syntax is not certified.
    const alternatives=result.get(name)??[];alternatives.push({name,path,parameterTokens,bodyTokens:nodes[end].children,span,sha256:hash(source.slice(span.start,span.end)),bodySpan:nodes[end].span});result.set(name,alternatives);i=end;
  }return result;
}
export function compileArithmeticSourceFragments(source,paths){
  if(!Array.isArray(paths)||paths.length>32||new Set(paths).size!==paths.length||paths.some(path=>typeof path!=='string'))throw new TypeError('Arithmetic source selection is invalid');
  const sourceTrees=originalMacroTrees(source),declarations=extract(sourceTrees,source),functions=[],constants=scalarConstants(sourceTrees,source);
  for(const name of paths){const alternatives=declarations.get(name);if(!alternatives?.length)throw new TypeError('Actual arithmetic function absent: '+name);if(alternatives.length!==1)throw new TypeError('Arithmetic function owner is ambiguous: '+name);const declaration=alternatives[0];const {bodyTokens,parameterTokens,...evidence}=declaration;const params=split(parameterTokens,',').map(tokens=>{const mutable=word(tokens[0])==='mut',offset=mutable?1:0;if(word(tokens[offset+1])!==':'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(word(tokens[offset])??''))throw new TypeError('Arithmetic source parameter binder unproved');return {name:word(tokens[offset]),mutable,type:type(tokens.slice(offset+2))};});functions.push({...evidence,params,ir:new Parser(bodyTokens).block()});}
  const issued={schema:'source-integer-loop-fragments-v1',sourceSha256:hash(source),functions,constants,projectionOnly:true,sourceAssumptions:['fixed unsigned primitive arithmetic with checked nonoverflow additions/products','as_limb/as_wide are arithmetic cast models, not resolved trait owner claims','source debug_assert conditions are domain preconditions; macro owner remains unknown','private temporary reference cells model only selected nonescaping arithmetic','usize projection is32-bit and bounded128 entries; source platform identity is not certified','Vec/slice/iterator/Option operations are mathematical sequence models; actual owners/Deref/Drop remain unresolved'],sourceOwnerVerified:false,macroOwnerVerified:false,sourceBehaviorFidelityVerified:false,parseAdmission:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false};const encoded=JSON.stringify(issued),program=freezeMacroTree({...JSON.parse(encoded),checkedMetaSha256:hash(encoded),privateMetaRoundtrip:true});seals.add(program);return program;
}
export const isArithmeticSourceFragments=value=>!!value&&seals.has(value);
const uint=(value,bits)=>{if(typeof value!=='bigint'||value<0n||value>=(1n<<BigInt(bits)))throw new RangeError('Arithmetic model unsigned bound');return {kind:'uint',value,bits};};
const bool=value=>({kind:'bool',value}),tuple=items=>({kind:'tuple',items}),literal=value=>({kind:'literal',value:BigInt(value)});
const deref=value=>value?.kind==='ref'?value.get():value;
function actual(value){value=deref(value);if(!['uint','literal','bool'].includes(value?.kind))throw new TypeError('Arithmetic scalar required');return value.value;}
function promoted(value,other){value=deref(value);return value.kind==='literal'&&other?.kind==='uint'?uint(value.value,other.bits):value;}
export function projectArithmeticSource(program,path,input,{limbBits=32,stepBudget=100000}={}){
  if(!isArithmeticSourceFragments(program)||![32,64].includes(limbBits)||!Number.isSafeInteger(stepBudget)||stepBudget<=0||stepBudget>1000000)throw new TypeError('Arithmetic projection requires private source program and bounded32/64 model');
  const definitions=new Map(program.functions.map(fn=>[fn.name,fn])),mutations=[],types={Limb:limbBits,Wide:limbBits*2,u32:32,u64:64,u128:128,usize:32};let steps=0;const calls=new Map();
  const step=()=>{if(++steps>stepBudget)throw new RangeError('Arithmetic projection step bound');};
  const cast=(value,name)=>{if(!types[name])throw new TypeError('Arithmetic alias is unproved');return uint(actual(value)&((1n<<BigInt(types[name]))-1n),types[name]);};
  function cell(value){let current=value;return {kind:'ref',get:()=>current,set:value=>{current=value;}};}
  function bind(value,type){if(type.kind==='uint')return uint(value,types[type.source]);if(type.kind==='ref'){if(type.inner.kind==='uint'){const ref=cell(bind(value,type.inner));mutations.push(ref);return ref;}if(type.inner.kind==='vector'||type.inner.kind==='slice'){if(utilTypes.isProxy(value)||!Array.isArray(value)||value.length>128||Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError('Arithmetic source vector domain');const descriptors=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(descriptors).length!==value.length+1)throw new TypeError('Arithmetic source vector has extra fields');const items=[];for(let i=0;i<value.length;i++){const descriptor=descriptors[i];if(!descriptor||!('value'in descriptor))throw new TypeError('Arithmetic source vector needs own scalar data');items.push(cell(uint(descriptor.value,limbBits)));}const ref=cell({kind:type.inner.kind,items});mutations.push(ref);return ref;}}throw new TypeError('Arithmetic source binding unsupported');}
  function expression(node,env,scope){step();switch(node.kind){
    case'literal':return literal(node.value);case'bool':return bool(node.value);case'name':{if(node.path.length===1&&env.has(node.path[0]))return env.get(node.path[0]).value;const name=node.path.length===1?[...scope,node.path[0]].join('::'):node.path.join('::'),matches=program.constants.filter(value=>value.name===name);if(matches.length!==1)throw new TypeError('Arithmetic source value binding unresolved');return uint(BigInt(matches[0].value),types[matches[0].type]);}
    case'not':{const value=deref(expression(node.value,env,scope));if(value.kind!=='bool')throw new TypeError('Arithmetic logical not needs checkedbool');return bool(!value.value);}
    case'conditional':{const condition=deref(expression(node.condition,env,scope));if(condition.kind!=='bool')throw new TypeError('Arithmetic condition needs checkedbool');const chosen=condition.value?node.body:node.otherwise;return chosen?block(chosen,new Map(env),scope):tuple([]);}
    case'deref':return deref(expression(node.value,env,scope));case'borrow':return place(node.value,env,scope);
    case'index':return deref(place(node,env,scope));case'slice':{const object=deref(expression(node.object,env,scope));if(!['slice','vector'].includes(object.kind))throw new TypeError('Arithmetic source slice unproved');const start=node.start?Number(actual(expression(node.start,env,scope))):0,end=node.end?Number(actual(expression(node.end,env,scope))):object.items.length;if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>object.items.length)throw new RangeError('Arithmetic slice bound');return {kind:'slice',items:object.items.slice(start,end)};}
    case'tuple':return tuple(node.items.map(value=>expression(value,env,scope)));case'field':{const object=deref(expression(node.object,env,scope));if(object.kind!=='tuple'||node.index>=object.items.length)throw new TypeError('Arithmetic tuple projection unproved');return object.items[node.index];}
    case'method':return method(deref(expression(node.object,env,scope)),node.name,node.args.map(value=>expression(value,env,scope)));
    case'call':{const args=node.args.map(value=>expression(value,env,scope));if(node.callee.kind==='typeCall'&&node.callee.path.join('::')==='mem::size_of'&&!args.length&&types[node.callee.type])return uint(BigInt(types[node.callee.type]/8),32);if(node.callee.kind==='typeCall'&&node.callee.path.join('::')==='Vec::default'&&node.callee.type==='Limb'&&!args.length)return {kind:'vector',items:[]};if(node.callee.kind==='name'&&node.callee.path.join('::')==='Some'&&args.length===1)return {kind:'option',value:args[0]};if(node.callee.kind!=='name')throw new TypeError('Arithmetic callable unresolved');const name=node.callee.path.join('::');if(['as_wide','as_limb'].includes(name)&&args.length===1)return cast(args[0],name==='as_wide'?'Wide':'Limb');const resolved=node.callee.path.length===1?[...scope,name].join('::'):name;return invoke(resolved,args);}
    case'match':{const value=actual(expression(node.subject,env,scope));const arm=node.arms.find(arm=>arm.pattern==='_'||BigInt(arm.pattern)===value);return expression(arm.value,env,scope);}
    case'binary':{let left=expression(node.left,env,scope);if(node.op==='&&'&&!actual(left))return bool(false);if(node.op==='||'&&actual(left))return bool(true);let right=expression(node.right,env,scope);left=promoted(left,deref(right));right=promoted(right,deref(left));if(['==','!='].includes(node.op)&&(deref(left).kind==='option'||deref(right).kind==='option')){const same=equalOption(deref(left),deref(right));return bool(node.op==='=='?same:!same);}const a=actual(left),b=actual(right);if(['==','!=','<','<=','>','>='].includes(node.op))return bool(node.op==='=='?a===b:node.op==='!='?a!==b:node.op==='<'?a<b:node.op==='<='?a<=b:node.op==='>'?a>b:a>=b);if(node.op==='&&'||node.op==='||')return bool(Boolean(b));if(['|','&'].includes(node.op)&&deref(left).kind==='bool'&&deref(right).kind==='bool')return bool(node.op==='|'?a||b:a&&b);left=deref(left);right=deref(right);const bits=left.kind==='uint'?left.bits:right.kind==='uint'?right.bits:null;if(!bits)throw new TypeError('Arithmetic integer context unproved');if(!['<<','>>'].includes(node.op)&&left.kind==='uint'&&right.kind==='uint'&&left.bits!==right.bits)throw new TypeError('Arithmetic primitive identities differ');let value;if(node.op==='+'||node.op==='-'||node.op==='*'||node.op==='/'){if(node.op==='/'&&b===0n)throw new RangeError('Arithmetic division byzero');value=node.op==='+'?a+b:node.op==='-'?a-b:node.op==='*'?a*b:a/b;}else if(node.op==='<<'||node.op==='>>'){if(b<0n||b>=BigInt(bits))throw new RangeError('Arithmetic shift domain');value=node.op==='<<'?(a<<b)&((1n<<BigInt(bits))-1n):a>>b;}else value=node.op==='|'?a|b:a&b;return uint(value,bits);}
    default:throw new TypeError('Arithmetic source IR node unsupported');
  }}
  function checked(value,type){if(type.kind==='uint'){value=promoted(value,{kind:'uint',bits:types[type.source]});if(value.kind!=='uint'||value.bits!==types[type.source])throw new TypeError('Arithmetic annotated integer identity differs');}else if(type.kind==='vector'&&deref(value).kind!=='vector')throw new TypeError('Arithmetic annotated vector identity differs');return value;}
  function pattern(pattern,value,env,mutable=false){if(pattern.kind==='name'){if(env.has(pattern.name))env.delete(pattern.name);env.set(pattern.name,{value,mutable});}else if(pattern.kind==='copy')patternBind(pattern.inner,deref(value),env,mutable);else if(pattern.kind==='tuple'){if(value.kind!=='tuple'||value.items.length!==pattern.items.length)throw new TypeError('Arithmetic loop tuple layout differs');pattern.items.forEach((item,index)=>patternBind(item,value.items[index],env,mutable));}else throw new TypeError('Arithmetic loop binding unsupported');}
  const patternBind=pattern;
  function block(ir,env,scope){
    for(const statement of ir.statements){step();
      if(statement.kind==='let'){let value=expression(statement.value,env,scope);if(statement.annotation)value=checked(value,statement.annotation);patternBind(statement.pattern,value,env,statement.mutable);}
      else if(statement.kind==='assign'){const value=expression(statement.right,env,scope),left=statement.left;
        if(left.kind==='name'){const slot=env.get(left.path[0]);if(!slot)throw new TypeError('Arithmetic assignment binding unresolved');if(!slot.mutable)throw new TypeError('Arithmetic assignment requires an actual mutable binder');const before=deref(slot.value),after=deref(value);if(before.kind==='uint'&&(after.kind!=='uint'||before.bits!==after.bits))throw new TypeError('Arithmetic assignment changes checked scalar identity');slot.value=value;}
        else if(left.kind==='deref'||left.kind==='index'){const ref=left.kind==='deref'?expression(left.value,env,scope):place(left,env,scope);if(ref.kind!=='ref')throw new TypeError('Arithmetic source place unproved');ref.set(value);}
        else throw new TypeError('Arithmetic assignment place unproved');}
      else if(statement.kind==='expression')expression(statement.value,env,scope);
      else if(statement.kind==='precondition'){if(!actual(expression(statement.condition,env,scope)))throw new RangeError('Unresolved original assertion precondition');}
      else if(statement.kind==='if'){const selected=actual(expression(statement.condition,env,scope))?statement.body:statement.otherwise;if(selected)block(selected,new Map(env),scope);}
      else if(statement.kind==='while'){while(actual(expression(statement.condition,env,scope))){step();block(statement.body,new Map(env),scope);}}
      else if(statement.kind==='for'){const iterable=deref(expression(statement.iterable,env,scope));if(!['vector','slice','iterator'].includes(iterable.kind))throw new TypeError('Arithmetic loop source unproved');const items=iterable.items.slice();for(const value of items){const child=new Map(env);patternBind(statement.pattern,value,child);block(statement.body,child,scope);}}
      else throw new TypeError('Arithmetic statement unsupported');
    }return expression(ir.tail,env,scope);
  }
  function place(node,env,scope){
    if(node.kind==='name'&&node.path.length===1){const slot=env.get(node.path[0]);if(!slot)throw new TypeError('Arithmetic borrowed binding absent');if(slot.value.kind==='ref')return slot.value;return {kind:'ref',get:()=>slot.value,set:value=>{if(!slot.mutable)throw new TypeError('Arithmetic source place is immutable');slot.value=value;}};}
    if(node.kind==='deref'){const ref=expression(node.value,env,scope);if(ref.kind!=='ref')throw new TypeError('Arithmetic borrowed source pointee absent');return ref;}
    if(node.kind==='index'){const object=deref(expression(node.object,env,scope)),index=Number(actual(expression(node.index,env,scope)));if(!['vector','slice'].includes(object.kind)||!Number.isInteger(index)||index<0||index>=object.items.length)throw new RangeError('Arithmetic index bound');return object.items[index];}
    if(node.kind==='slice')return cell(expression(node,env,scope));
    if(node.kind==='literal')return cell(literal(node.value));
    throw new TypeError('Arithmetic borrowed source place unproved');
  }
  function equalOption(left,right){if(left.kind!=='option'||right.kind!=='option')throw new TypeError('Arithmetic option comparison shape');return left.value===null||right.value===null?left.value===right.value:actual(left.value)===actual(right.value);}
  function method(object,name,args){
    if(['min','max'].includes(name)&&object.kind==='uint'&&args.length===1){const other=promoted(args[0],object);if(other.kind!=='uint'||other.bits!==object.bits)throw new TypeError('Arithmetic ordered primitive identity');return name==='min'?(object.value<other.value?object:other):(object.value>other.value?object:other);}
    if(name==='leading_zeros'&&!args.length&&object.kind==='uint')return uint(BigInt(object.value===0n?object.bits:object.bits-object.value.toString(2).length),32);
    if(['overflowing_add','overflowing_sub'].includes(name)&&object.kind==='uint'&&args.length===1){const right=promoted(args[0],object);if(right.kind!=='uint'||right.bits!==object.bits)throw new TypeError('Arithmetic overflowing primitive identity');const q=1n<<BigInt(object.bits),sum=name==='overflowing_add'?object.value+right.value:object.value-right.value;return tuple([uint((sum+q)&(q-1n),object.bits),bool(sum<0n||sum>=q)]);}
    if(['vector','slice'].includes(object.kind)){
      if(name==='len'&&!args.length)return uint(BigInt(object.items.length),32);
      if(name==='is_empty'&&!args.length)return bool(!object.items.length);
      if(['iter','iter_mut'].includes(name)&&!args.length)return {kind:'iterator',items:object.items.slice()};
      if(name==='last'&&!args.length)return {kind:'option',value:object.items.at(-1)??null};
      if(object.kind==='vector'){
        if(name==='push'&&args.length===1){if(object.items.length>=128)throw new RangeError('Arithmetic vector bound');object.items.push(cell(cast(args[0],'Limb')));return tuple([]);}
        if(name==='pop'&&!args.length)return {kind:'option',value:object.items.pop()??null};
        if(name==='resize'&&args.length===2){const length=Number(actual(args[0]));if(!Number.isInteger(length)||length<0||length>128)throw new RangeError('Arithmetic vector resize bound');while(object.items.length<length)object.items.push(cell(cast(args[1],'Limb')));object.items.length=length;return tuple([]);}
        if(name==='extend_from_slice'&&args.length===1){const other=deref(args[0]);if(!['slice','vector'].includes(other.kind)||object.items.length+other.items.length>128)throw new RangeError('Arithmetic slice extension bound');object.items.push(...other.items.map(value=>cell(cast(deref(value),'Limb'))));return tuple([]);}
      }
    }
    if(object.kind==='iterator'){
      if(name==='enumerate'&&!args.length)return {kind:'iterator',items:object.items.map((value,index)=>tuple([uint(BigInt(index),32),value]))};
      if(name==='zip'&&args.length===1){const other=deref(args[0]);if(other.kind!=='iterator')throw new TypeError('Arithmetic zip source unproved');return {kind:'iterator',items:object.items.slice(0,other.items.length).map((value,index)=>tuple([value,other.items[index]]))};}
    }
    throw new TypeError('Arithmetic method has no checked model');
  }

  function invoke(name,args){step();calls.set(name,(calls.get(name)??0)+1);const fn=definitions.get(name);if(!fn||args.length!==fn.params.length)throw new TypeError('Arithmetic source callable absent');const checked=fn.params.map((param,index)=>{let value=args[index];if(param.type.kind==='uint'){value=promoted(value,{kind:'uint',bits:types[param.type.source]});if(value.kind!=='uint'||value.bits!==types[param.type.source])throw new TypeError('Arithmetic call parameter identity differs');}else if(param.type.kind==='ref'){if(value.kind!=='ref')throw new TypeError('Arithmetic call needs the actual reference place');const inner=deref(value);if(param.type.inner.kind==='uint'&&(inner.kind!=='uint'||inner.bits!==types[param.type.inner.source])||param.type.inner.kind==='vector'&&inner.kind!=='vector'||param.type.inner.kind==='slice'&&!['slice','vector'].includes(inner.kind))throw new TypeError('Arithmetic reference pointee differs');}return [param.name,{value,mutable:param.mutable}];});return block(fn.ir,new Map(checked),fn.path);}
  function output(value){value=deref(value);if(['uint','literal','bool'].includes(value.kind))return value.value;if(value.kind==='tuple')return value.items.map(output);if(['vector','slice'].includes(value.kind))return value.items.map(output);throw new TypeError('Arithmetic projection output unproved');}
  const fn=definitions.get(path);if(!fn||utilTypes.isProxy(input)||!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length!==fn.params.length)throw new TypeError('Arithmetic source entry arguments invalid');const descriptors=Object.getOwnPropertyDescriptors(input);if(Reflect.ownKeys(descriptors).length!==input.length+1)throw new TypeError('Arithmetic arguments have extra fields');const args=fn.params.map((param,index)=>{const descriptor=descriptors[index];if(!descriptor||!('value'in descriptor))throw new TypeError('Arithmetic arguments need own data');return bind(descriptor.value,param.type);}),value=invoke(path,args);
  return freezeMacroTree({value:output(value),mutations:mutations.map(output),steps,calls:[...calls].map(([path,count])=>({path,count})),projectionOnly:true,sourceBehaviorFidelityVerified:false,parseAdmission:false,applicationEffectCompleteness:false,runtimeParity:false});
}
