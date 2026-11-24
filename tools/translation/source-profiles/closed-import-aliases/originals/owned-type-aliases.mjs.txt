// Concrete type substitutions only. The entire resulting source must still
// pass the independent private owned checker; this module issues no IR.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned type aliases: '+message);};
function replace(source,edits){let after=source,last=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('complete original type substitutions overlap or differ');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);last=row.span[0];}return after;}
function native(source,path){const ts=ownershipCompiler();if(ts.version!=='5.9.3'||typeof source!=='string'||source.length>2097152)fail('bounded complete source and lockfile TypeScript5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete native TypeScript grammar differs');const options={target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext,noLib:true,noResolve:true,noEmit:true},host={getSourceFile:name=>name===path?file:undefined,getDefaultLibFileName:()=>'/__absent_lib.d.ts',writeFile:()=>fail('alias selection cannot emit'),getCurrentDirectory:()=> '/',getDirectories:()=>[],fileExists:name=>name===path,readFile:name=>name===path?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'},program=ts.createProgram({rootNames:[path],options,host});return {ts,file,checker:program.getTypeChecker()};}
function canonical(text){const ts=ownershipCompiler(),file=ts.createSourceFile('closed-type.ts','type Closed = '+text+';',ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete closed type grammar differs');let node=file.statements[0]?.type;if(!node)fail('complete closed type required');while(ts.isParenthesizedTypeNode(node))node=node.type;let cells=0;function shape(value,depth=0){if(++cells>100000||depth>64)fail('closed type comparison bound exceeded');if(ts.isParenthesizedTypeNode(value))return shape(value.type,depth+1);const children=[];ts.forEachChild(value,child=>{children.push(shape(child,depth+1));});return [value.kind,children.length?children:value.getText(file)];}return {text:node.getText(file),node,ts,file,key:JSON.stringify(shape(node))};}
function satisfies(actual,constraint){
 const a=canonical(actual),b=canonical(constraint);if(a.key===b.key)return true;
 if(b.node.kind===b.ts.SyntaxKind.UnknownKeyword)return true;
 if(b.ts.isUnionTypeNode(b.node))return b.node.types.some(node=>satisfies(actual,node.getText(b.file)));
 if(a.ts.isUnionTypeNode(a.node))return a.node.types.every(node=>satisfies(node.getText(a.file),constraint));
 if(a.ts.isLiteralTypeNode(a.node)){const value=a.node.literal;if(a.ts.isStringLiteral(value)&&b.node.kind===b.ts.SyntaxKind.StringKeyword)return true;if((a.ts.isNumericLiteral(value)||a.ts.isPrefixUnaryExpression(value)&&a.ts.isNumericLiteral(value.operand))&&b.node.kind===b.ts.SyntaxKind.NumberKeyword)return true;if((a.ts.isBigIntLiteral(value)||a.ts.isPrefixUnaryExpression(value)&&a.ts.isBigIntLiteral(value.operand))&&b.node.kind===b.ts.SyntaxKind.BigIntKeyword)return true;if([a.ts.SyntaxKind.TrueKeyword,a.ts.SyntaxKind.FalseKeyword].includes(value.kind)&&b.node.kind===b.ts.SyntaxKind.BooleanKeyword)return true;}
 return false;
}
export function expandOwnedTypeAliases(source,{sourcePath='owned-aliases.mts'}={}){
 const original=transportConcreteSyntaxSource(source,{language:'TypeScript'});if(transportConcreteSyntaxMeta(original.meta).source!==source)fail('complete source CST differs');const {ts,file,checker}=native(source,sourcePath),aliases=new Map(),observations=[],uses=[],edits=[],active=new Set();let cells=0,expandedBytes=0,historyUnits=0;
 for(const node of file.statements)if(ts.isTypeAliasDeclaration(node)){
  if(node.modifiers?.length)fail('public type aliases require the separate public API profile');const symbol=checker.getSymbolAtLocation(node.name);if(!symbol||aliases.has(symbol)||(node.typeParameters?.length??0)>32)fail('one bounded actual alias declaration required');aliases.set(symbol,node);observations.push({name:node.name.text,source:node.getText(file),span:[node.getStart(file),node.end]});
 }
 if(aliases.size>4096)fail('complete type alias census exceeds its bound');
 const aliasEdges=new Map();for(const alias of aliases.values()){
  const dependencies=new Set(),parameters=new Set((alias.typeParameters??[]).map(row=>checker.getSymbolAtLocation(row.name)));let count=0;if(parameters.has(undefined)||parameters.size!==(alias.typeParameters?.length??0))fail('unique actual generic parameter bindings required');
  function validate(node,depth=0){
   if(++count>100000||depth>64)fail('complete alias declaration bound exceeded');
   if(ts.isTypeReferenceNode(node)){
    if(!ts.isIdentifier(node.typeName))fail('qualified type aliases require a separately checked namespace profile');const symbol=checker.getSymbolAtLocation(node.typeName),target=aliases.get(symbol);if(target)dependencies.add(target);else if(!parameters.has(symbol)&&!symbol?.declarations?.length&&!['ReturnType','Parameters'].includes(node.typeName.text))fail('unresolved actual alias type binding');if(node.typeArguments)for(const argument of node.typeArguments)validate(argument,depth+1);return;
   }
   if(ts.isTypeQueryNode(node)){const declarations=ts.isIdentifier(node.exprName)?checker.getSymbolAtLocation(node.exprName)?.declarations:null;if(!declarations?.length||declarations.some(ts.isTypeParameterDeclaration))fail('actual named value type query binding required');return;}
   if(ts.isArrayTypeNode(node)||ts.isParenthesizedTypeNode(node)){validate(node.elementType??node.type,depth+1);return;}
   if(ts.isTypeOperatorNode(node)&&node.operator===ts.SyntaxKind.ReadonlyKeyword){validate(node.type,depth+1);return;}
   if(ts.isUnionTypeNode(node)){for(const member of node.types)validate(member,depth+1);return;}
   if(ts.isIndexedAccessTypeNode(node)&&ts.isLiteralTypeNode(node.indexType)){validate(node.objectType,depth+1);return;}
   if(ts.isLiteralTypeNode(node)||[ts.SyntaxKind.StringKeyword,ts.SyntaxKind.NumberKeyword,ts.SyntaxKind.BooleanKeyword,ts.SyntaxKind.BigIntKeyword,ts.SyntaxKind.UndefinedKeyword,ts.SyntaxKind.UnknownKeyword,ts.SyntaxKind.NeverKeyword].includes(node.kind))return;
   fail('type alias construct needs its own checked domain rule');
  }
  const indices=new Map((alias.typeParameters??[]).map((row,index)=>[checker.getSymbolAtLocation(row.name),index]));let defaultSeen=false;for(const [index,parameter]of [...(alias.typeParameters??[])].entries()){if(parameter.modifiers?.length||defaultSeen&&!parameter.default)fail('ordinary ordered generic alias defaults required');defaultSeen ||= !!parameter.default;for(const type of [parameter.constraint,parameter.default])if(type){validate(type);const earlier=node=>{if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)){const at=indices.get(checker.getSymbolAtLocation(node.typeName));if(at!==undefined&&at>=index)fail('closed constraints/defaults may refer only to earlier parameters');}ts.forEachChild(node,earlier);};earlier(type);}}validate(alias.type);aliasEdges.set(alias,dependencies);
 }
 const aliasState=new Map();function validateClosure(alias,depth=0){if(depth>64)fail('complete alias dependency depth bound exceeded');if(aliasState.get(alias)==='active')fail('recursive type alias needs its own recursive meta profile');if(aliasState.get(alias)==='checked')return;aliasState.set(alias,'active');for(const target of aliasEdges.get(alias))validateClosure(target,depth+1);aliasState.set(alias,'checked');}for(const alias of aliases.values())validateClosure(alias);
 function expand(node,environment=new Map(),depth=0){
  if(++cells>100000||depth>64)fail('complete type expansion node/depth bound exceeded');
  if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)){
   const symbol=checker.getSymbolAtLocation(node.typeName);if(environment.has(symbol)){if(node.typeArguments?.length)fail('type parameter is not a generic constructor');return '('+environment.get(symbol)+')';}
   const alias=aliases.get(symbol);if(alias){
    if(active.has(alias))fail('recursive type alias needs its own recursive meta profile');const parameters=alias.typeParameters??[],arguments_=node.typeArguments??[];if(arguments_.length>parameters.length)fail('too many actual alias arguments');const scope=new Map(environment),actual=[];
    for(let at=0;at<parameters.length;at++){const parameter=parameters[at],written=arguments_[at],parameterSymbol=checker.getSymbolAtLocation(parameter.name);if(!parameterSymbol||parameter.modifiers?.length)fail('actual ordinary generic parameter binding required');const value=written?expand(written,environment,depth+1):parameter.default?expand(parameter.default,scope,depth+1):fail('missing actual alias argument');if(parameter.constraint&&!satisfies(value,expand(parameter.constraint,scope,depth+1)))fail('actual generic argument does not meet the closed written constraint');scope.set(parameterSymbol,value);actual.push(value);}
    active.add(alias);let after;try{after=expand(alias.type,scope,depth+1);}finally{active.delete(alias);}historyUnits+=after.length+actual.reduce((size,value)=>size+value.length,0);if(historyUnits>2097152||uses.length>=4096)fail('complete alias substitution history bound exceeded');uses.push({name:alias.name.text,span:[node.getStart(file),node.end],declarationSpan:[alias.getStart(file),alias.end],arguments:actual,after,sourceAuthority:false,semanticAuthority:false});return '('+after+')';
   }
  }
  const before=node.getText(file),start=node.getStart(file),selected=[];ts.forEachChild(node,child=>{if(ts.isTypeNode(child)){const after=expand(child,environment,depth+1),expected=child.getText(file);if(expected!==after)selected.push({span:[child.getStart(file)-start,child.end-start],expected,replacement:after});}else{const symbol=ts.isIdentifier(child)?checker.getSymbolAtLocation(child):null;if(symbol&&environment.has(symbol))fail('generic parameter appears outside a closed type reference');}});const after=replace(before,selected);expandedBytes+=after.length;if(expandedBytes>2097152)fail('complete expanded type byte bound exceeded');return after;
 }
 for(const alias of aliases.values())for(const parameter of alias.typeParameters??[])if(parameter.default&&parameter.constraint){let open=false;const visit=node=>{if(ts.isTypeReferenceNode(node)&&checker.getSymbolAtLocation(node.typeName)?.declarations?.some(ts.isTypeParameterDeclaration))open=true;ts.forEachChild(node,visit);};visit(parameter.default);visit(parameter.constraint);if(!open&&!satisfies(expand(parameter.default),expand(parameter.constraint)))fail('closed generic default does not satisfy its actual written constraint');}
 const seen=new WeakSet();function visit(node,depth=0){
  if(seen.has(node))return;seen.add(node);if(++cells>100000||depth>160)fail('complete native alias use bound exceeded');if(ts.isTypeAliasDeclaration(node))return;
  if(ts.isTypeNode(node)){const replacement=expand(node),expected=node.getText(file);if(replacement!==expected)edits.push({span:[node.getStart(file),node.end],expected,replacement,kind:'native-bound-type-alias-instantiation'});return;}
  if(node.typeParameters?.length)fail('generic runtime functions need their own checked specialization profile');ts.forEachChild(node,child=>visit(child,depth+1));
 }visit(file);
 const general=replace(source,edits),aliasEdits=[];
 // Declaration spans move when earlier annotations expand. Select the actual
 // aliases again from the complete intermediate source instead of rebasing.
 const middle=native(general,sourcePath);for(const node of middle.file.statements)if(middle.ts.isTypeAliasDeclaration(node))aliasEdits.push({span:[node.getStart(middle.file),node.end],expected:node.getText(middle.file),replacement:'',kind:'checked-source-type-alias-declaration'});
 const run=createRulePipeline([{phase:'language',rules:[{id:'typescript:substitute-actual-native-alias-parameters-defaults-and-closed-constraints',apply:()=>general}]},{phase:'repository',rules:[{id:'router:erase-only-complete-alias-declarations-before-independent-owned-checking',apply:value=>replace(value,aliasEdits)}]}]).run(source),after=run.value,equations=transportConcreteSourceEquations([{before:source,after:general,language:'TypeScript'},{before:general,after,language:'TypeScript'}]);if(equations[0].inverse!==source||equations[1].inverse!==general)fail('complete alias source inverse differs');native(after,sourcePath);
 return {source:after,history:{schema:'router-owned-type-alias-source-v1',sourcePath,before:source,general,after,concreteSyntax:original.meta,aliases:observations,uses,languageSelections:edits,repositorySelections:aliasEdits,equations,trace:run.trace,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false}};
}
