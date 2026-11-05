// Closed scalar-domain substitution. These native type-node observations are
// DATA; written contracts still have to match independently checked value IR.
const ALL=['string','number','boolean','null','undefined'];
const fail=message=>{throw new TypeError('Typed portable scalar alias: '+message);};
const subset=(actual,wanted)=>[...actual].every(value=>wanted.has(value));
export function createScalarTypeResolver({ts,kinds,aliases,file}){
 let visited=0;const history=[];
 function canonical(domain){
  const values=[...domain],present=values.filter(value=>['string','number','boolean'].includes(value)),absent=values.filter(value=>value==='null'||value==='undefined');
  if(values.length===1)return values[0];
  if(values.length===2&&present.length===1&&absent.length===1)return present[0]+'|'+absent[0];
  fail('only a closed scalar plus null or undefined union is supported');
 }
 function parameters(alias){
  const parameters=[...(alias.typeParameters??[])],names=new Set();let optional=false;
  if(parameters.length>8)fail('bounded scalar alias parameter list required');
  for(const parameter of parameters){
   if(!ts.isIdentifier(parameter.name)||parameter.modifiers?.length||names.has(parameter.name.text))fail('ordinary unique scalar alias type parameters required');
   names.add(parameter.name.text);if(parameter.default)optional=true;else if(optional)fail('required type parameter follows a default');
  }return parameters;
 }
 function expand(alias,arguments_,active,depth,record,abstract=false){
  const name=alias.name.text;if(active.has(name))fail('unresolved or recursive scalar alias');
  const parameters_=parameters(alias),next=new Set(active).add(name),bindings=new Map(),scope=new Set(parameters_.map(parameter=>parameter.name.text));
  if(arguments_.length>parameters_.length)fail('scalar alias type argument count differs');
  const substitutions=[];
  for(let index=0;index<parameters_.length;index++){
   const parameter=parameters_[index],constraint=parameter.constraint?domain(parameter.constraint,bindings,scope,next,depth+1,record):new Set(ALL);
   if(!constraint.size)fail('nonempty scalar alias constraint required');
   const fallback=parameter.default?domain(parameter.default,bindings,scope,next,depth+1,record):null;
   if(fallback&&!subset(fallback,constraint))fail('scalar alias default violates its written constraint');
   const actual=abstract?constraint:arguments_[index]??fallback;
   if(!actual)fail('missing required scalar alias type argument');
   if(!subset(actual,constraint))fail('scalar alias argument violates its written constraint');
   bindings.set(parameter.name.text,actual);substitutions.push({name:parameter.name.text,domain:[...actual],constraint:[...constraint],defaultSelected:!abstract&&index>=arguments_.length});
  }
  const result=domain(alias.type,bindings,scope,next,depth+1,record);
  if(record){if(history.length>=4096)fail('bounded scalar alias substitution history required');history.push({name,span:[alias.getStart(file),alias.end],substitutions,result:[...result],sourceAuthority:false,semanticAuthority:false});}
  return result;
 }
 function domain(node,bindings=new Map(),scope=new Set(),active=new Set(),depth=0,record=false){
  if(!node||++visited>32768||depth>64)fail('bounded explicit scalar source type required');
  const primitive=kinds.get(node.kind);if(primitive)return new Set([primitive]);
  if(ts.isLiteralTypeNode(node)&&node.literal.kind===ts.SyntaxKind.NullKeyword)return new Set(['null']);
  if(ts.isParenthesizedTypeNode(node))return domain(node.type,bindings,scope,active,depth+1,record);
  if(ts.isUnionTypeNode(node))return new Set(node.types.flatMap(value=>[...domain(value,bindings,scope,active,depth+1,record)]));
  if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)){
   const name=node.typeName.text;
   if(scope.has(name)){if(node.typeArguments?.length||!bindings.has(name))fail('unbound or parameterized scalar type parameter');return bindings.get(name);}
   if(!aliases.has(name))fail('unresolved scalar alias');
   const arguments_=[...(node.typeArguments??[])].map(value=>domain(value,bindings,scope,active,depth+1,record));
   return expand(aliases.get(name),arguments_,active,depth+1,record);
  }
  fail('type is outside the explicit scalar/absence alias domain');
 }
 function validateAliases(){
  if(aliases.size>4096)fail('bounded complete alias census required');
  for(const alias of aliases.values()){
   const result=expand(alias,[],new Set(),0,false,Boolean(alias.typeParameters?.length));
   if(!alias.typeParameters?.length)canonical(result);
  }
 }
 return {resolve:node=>canonical(domain(node,new Map(),new Set(),new Set(),0,true)),validateAliases,history};
}
