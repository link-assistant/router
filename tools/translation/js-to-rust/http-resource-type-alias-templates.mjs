// Original native type-template syntax DATA. No slot or alias issues a type,
// value, source, lifetime or ownership permit. Whole actual uses still check.
import {httpResourceCallerContract} from './http-resource-caller-contracts.mjs';
const fail=message=>{throw new TypeError('Resource original alias template: '+message);};
export function httpResourceTypeAliasBindings(ts,alias,written,bindings,tick=()=>{},read=null){
 tick();const parameters=alias.typeParameters??[],arguments_=written.typeArguments??[];
 if(arguments_.length>parameters.length||parameters.length>32)fail('complete bounded original alias argument arity required');
 const result=new Map();let optional=false;
 for(let index=0;index<parameters.length;index++){
  tick();const parameter=parameters[index];if(parameter.modifiers?.length||!ts.isIdentifier(parameter.name)||result.has(parameter.name.text)||optional&&!parameter.default)fail('unique original slots with trailing defaults required');optional||=!!parameter.default;
  const earlier=new Map(result),value=arguments_[index]?{node:arguments_[index],bindings}:parameter.default?{node:parameter.default,bindings:earlier}:null;if(!value)fail('every required original type argument must be supplied');
  if(read){const actual=read(value.node,value.bindings);if(parameter.constraint){const constraint=read(parameter.constraint,earlier);if(JSON.stringify(actual)!==JSON.stringify(constraint))fail('actual original type argument must preserve its complete native constraint domain');}}result.set(parameter.name.text,value);
 }return result;
}
export function httpResourceTypeAliasSlot(ts,node,bindings){
 if(!ts.isTypeReferenceNode(node)||!ts.isIdentifier(node.typeName)||!bindings?.has(node.typeName.text))return null;
 if(node.typeArguments?.length)fail('an original type slot cannot take type arguments');return bindings.get(node.typeName.text);
}
export function validateHttpResourceTypeAliasTemplates(ts,aliases,imports,{name,tick,read=null}={}){
 const edges=new Map();let cells=0;
 const step=()=>{tick();if(++cells>200000)fail('complete original alias template source bound');};
 function dependent(node,parameters){let found=false;const visit=(child,depth=0)=>{step();if(depth>128)fail('complete bounded native template dependency required');if(ts.isTypeReferenceNode(child)&&ts.isIdentifier(child.typeName)&&parameters.has(child.typeName.text))found=true;ts.forEachChild(child,value=>visit(value,depth+1));};visit(node);return found;}
 for(const [id,alias]of aliases){
  const parameters=new Set(),references=new Set(),symbolic=new Map();edges.set(id,references);
  for(const parameter of alias.typeParameters??[]){const slot=name(parameter.name.text);if(parameter.modifiers?.length||parameters.has(slot)||parameters.size>=32)fail('bounded unique original nongenerated type slots required');parameters.add(slot);}
  const bounded=node=>{step();if(typeof read!=='function')fail('fresh original native constraint reader required');return read(node,0,symbolic);};
  function inspect(node,depth=0,available=parameters){
   step();if(!node||depth>64||node.getSourceFile()!==alias.getSourceFile())fail('complete original native template nodes required');
   if(ts.isParenthesizedTypeNode(node))return inspect(node.type,depth+1,available);
   if([ts.SyntaxKind.StringKeyword,ts.SyntaxKind.BooleanKeyword,ts.SyntaxKind.BigIntKeyword].includes(node.kind)||ts.isLiteralTypeNode(node)&&node.literal.kind===ts.SyntaxKind.NullKeyword)return;
   if(ts.isTypeQueryNode(node)){if(!ts.isIdentifier(node.exprName))fail('template typeof requires its real original operation binding');if(imports.get(node.exprName.text)==='deferFilesystemFlow'){if(node.typeArguments?.length!==1)fail('complete original cold-flow type instantiation required');inspect(node.typeArguments[0],depth+1,available);return;}if(node.typeArguments?.length||!httpResourceCallerContract(imports.get(node.exprName.text)))fail('template typeof requires its real original operation binding');return;}
   if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)){
    const target=node.typeName.text,args=node.typeArguments??[];
    if(parameters.has(target)){if(!available.has(target))fail('an original constraint/default may reference only earlier original slots');if(args.length)fail('template slots cannot be generic constructors');return;}
    if(aliases.has(target)){const slots=aliases.get(target).typeParameters??[],required=slots.filter(slot=>!slot.default).length;if(args.length<required||args.length>slots.length)fail('complete required and default alias argument arity required');references.add(target);for(const argument of args)inspect(argument,depth+1,available);return;}
    const expected=target==='Extract'?2:['Parameters','ReturnType','Awaited'].includes(target)?1:null;if(expected===null||args.length!==expected)fail('closed original template constructor required');inspect(args[0],depth+1,available);
    if(['Parameters','ReturnType'].includes(target)&&dependent(args[0],parameters)&&!(ts.isTypeQueryNode(args[0])&&ts.isIdentifier(args[0].exprName)&&imports.get(args[0].exprName.text)==='deferFilesystemFlow')){const actual=bounded(args[0]);if(actual.kind!=='function')fail('actual complete callable constraint required');}
    if(target==='Extract'){const predicate=args[1],field=ts.isTypeLiteralNode(predicate)&&predicate.members.length===1?predicate.members[0]:null;if(!field||!ts.isPropertySignature(field)||field.questionToken||field.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ReadonlyKeyword)||!ts.isIdentifier(field.name)||field.name.text!=='$'||!ts.isLiteralTypeNode(field.type)||!ts.isStringLiteral(field.type.literal)||!['Ok','Some'].includes(field.type.literal.text))fail('actual single successful template tag required');}return;
   }
   if(ts.isIndexedAccessTypeNode(node)){
    inspect(node.objectType,depth+1,available);const index=node.indexType;if(!(index.kind===ts.SyntaxKind.NumberKeyword||ts.isLiteralTypeNode(index)&&(ts.isNumericLiteral(index.literal)&&/^[0-9]+$/u.test(index.literal.text)||ts.isStringLiteral(index.literal)&&index.literal.text==='field0')))fail('closed original template index required');if(dependent(node.objectType,parameters))bounded(node);return;
   }
   fail('alias template needs a separate complete original source rule');
  }
  let optional=false;const available=new Set();
  for(const parameter of alias.typeParameters??[]){
   step();if(optional&&!parameter.default)fail('required original type slots cannot follow defaults');optional||=!!parameter.default;const earlier=new Map(symbolic);
   if(parameter.constraint){inspect(parameter.constraint,0,available);bounded(parameter.constraint);}
   if(parameter.default){inspect(parameter.default,0,available);if(parameter.constraint&&JSON.stringify(bounded(parameter.default))!==JSON.stringify(bounded(parameter.constraint)))fail('every original default must satisfy its complete native constraint');}
   symbolic.set(parameter.name.text,parameter.constraint?{node:parameter.constraint,bindings:earlier}:{node:null,bindings:null});available.add(parameter.name.text);
  }
  inspect(alias.type);
 }
 const completed=new Set(),active=new Set();function acyclic(id,depth=0){step();if(depth>32||active.has(id))fail('complete acyclic original alias declaration graph required');if(completed.has(id))return;active.add(id);for(const target of edges.get(id))acyclic(target,depth+1);active.delete(id);completed.add(id);}for(const id of aliases.keys())acyclic(id);
}
