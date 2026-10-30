// Explicit candidate DATA helpers. Only the copied private original checker
// can issue a checked function. No supplied metadata or type flag is consumed.
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalModuleViewItems} from '../source-module-views.mjs';
import {sameType} from '../checked-types.mjs';
import {createHash} from 'node:crypto';
const fail=message=>{throw new TypeError('Owned reverse vector candidate: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
const exact=(row,names)=>{if(!row||typeof row!=='object'||Array.isArray(row)||JSON.stringify(Object.keys(row).sort())!==JSON.stringify([...names].sort()))fail('exact source binding fields required');};
const names=['bool','u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize','f64','text-owned','str-static'];
export const ownedVectorCandidateRustTypes=Object.freeze(Object.fromEntries(names.map(name=>['vec:'+name,'::std::vec::Vec<'+(name==='text-owned'?'::std::string::String':name==='str-static'?"&'static ::std::primitive::str":name)+'>'])));
export const ownedVectorCandidateTypeScriptTypes=Object.freeze(Object.fromEntries(names.map(name=>['vec:'+name,'readonly '+(name==='bool'?'boolean':name==='f64'?'number':['text-owned','str-static'].includes(name)?'string':'bigint')+'[]'])));
function scalar(type){
 const ownedText=type?.kind==='string'&&type.rustSourceType===true&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String';
 if(!type||type.rustReference||type.patternOwnershipRefusal&&!(ownedText&&['ownership-bearing String type','owned String source type','owned String formatting','owned String construction','owned String conversion','owned String replacement'].includes(type.patternOwnershipRefusal))||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved)fail('unresolved or borrowed vector element');
 if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&type.rustBorrowLifetime?.kind==='static'&&(type.rustSourceType===true||type.rustBorrowLifetime.source==='string-literal'))return {name:'str-static',kind:'static-text'};
 if(type.kind==='bool')return {name:'bool',kind:'bool'};
 if(type.kind==='string'&&type.rustSourceType===true&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String')return {name:'text-owned',kind:'text'};
 if(type.kind==='float'&&type.rustPrimitiveName==='f64'&&type.rustSourceType===true&&!type.rustOwnership)return {name:'f64',kind:'float'};
 const name=type.rustPrimitiveName;if(type.kind!=='fixed'||!names.includes(name)||name==='bool'||![8,16,32,64,128].includes(type.bits)||typeof type.signed!=='boolean')fail('only genuine bool/integer/f64 or actual owned String elements are implemented; nonstatic borrowed text remains refused');
 const expected=name==='usize'||name==='isize'?64:Number(name.slice(1));if(type.bits!==expected||type.signed!==name.startsWith('i'))fail('actual original primitive width/signedness differs');return {name,kind:'integer',bits:type.bits,signed:type.signed};
}
function bindings(data,path){
 if(!Array.isArray(data.vectorBindings)||data.vectorBindings.length>4096)fail('bounded actual source bindings required');const seen=new Set(),selected=[];
 for(const row of data.vectorBindings){exact(row,['javascriptPath','javascriptName','rustPath','rustName']);for(const key of Object.keys(row))if(typeof row[key]!=='string'||!row[key].length)fail('primitive source binding required');const id=JSON.stringify([row.javascriptPath,row.javascriptName]);if(seen.has(id))fail('duplicate original function binding');seen.add(id);if(row.javascriptPath===path)selected.push(row);}
 return selected;
}
/** A new complete forward invocation, local to this fresh reverse traversal. */
export function captureOriginalOwnedVectorProfiles(data,path){
 const selected=bindings(data,path),profiles=new Map();if(!selected.length)return profiles;
 const files=new Map(data.files.map(row=>[row.path,row.source])),paths=[...files.keys()].filter(name=>name.endsWith('.rs')).sort();if(!files.has('src/lib.rs'))fail('complete original Rust entry required');
 // No public saved checked/meta projection is read. The actual freshly returned
 // checkedSource closure closes over the original same-invocation checked
 // program and parsed signature. Target lowering supplies portable shape only.
 const dependencyInputs={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')},jsonMacroDependencies=jsonMacroDependencyProfile(dependencyInputs).proof,deriveDependencies=deriveDependencyProfile(dependencyInputs).proof;
 let result;try{result=translateProject({jsonMacroDependencies,deriveDependencies,entry:'src/lib.rs',paths,readSource:name=>{if(!files.has(name))fail('missing actual Rust source');return files.get(name);},compilationProfile:PRODUCTION_PROFILE,cargoManifest:files.get('Cargo.toml')});
 const sourceCensus=ownedVectorOriginalProjectCensus(result);
 for(const binding of selected){
  const candidates=result.executableDeclarations.filter(row=>row.source===binding.rustPath&&row.qualifiedName===binding.rustName);if(candidates.length!==1)fail('actual original executable Rust function is absent or ambiguous');const original=candidates[0],source=files.get(original.source);if(typeof source!=='string'||original.sourceSha256!==hash(source)||typeof original.lower!=='function'||typeof original.checkedSource!=='function')fail('fresh actual original source/carrier differs');
  const captured=original.checkedSource(),own=captured?.declaration,written=captured?.sourceSignature,ret=written?.ret;
  if(captured?.schema!=='original-checked-executable-source-v1'||captured.source!==original.source||captured.sourceSha256!==hash(source)||captured.qualifiedName!==original.qualifiedName||JSON.stringify(captured.span)!==JSON.stringify(original.span)||JSON.stringify(captured.module)!==JSON.stringify(original.qualifiedName.split('.').slice(0,-1))||own?.fullName!==original.qualifiedName||JSON.stringify(own.span)!==JSON.stringify(captured.checkedSpan))fail('fresh checked source/carrier join differs');
  if(own.k!=='fn'||own.async||own.params.length!==written.params.length||own.params.length>32||ret?.kind!=='array'||ret.rustSourceType!==true||ret.rustOwnership?.kind!=='owned'||ret.rustOwnership.source!=='Vec'||ret.rustFixedArray||ret.rustReference||ret.patternOwnershipRefusal!=='ownership-bearing Vec type'||ret.rustGenericIdentityUnresolved||ret.rustBorrowingUnresolved)fail('actual bounded scalar-parameter owned Vec signature required; fixed arrays and borrows remain refused');
  // The original parser marks Vec as unsafe for ownership-erasing patterns.
  // This exact marker is supported only with the same checked owned-list body;
  // arbitrary refusal markers and every borrowed/fixed-array signature refuse.
  const lowered=original.lower(),jsonDomain=originalJsonVectorDomain(own,lowered);
  const tail=jsonDomain?checkedOwnedJsonVectorTail(own,(type,value)=>{if(type?.kind==='unit'){if(value?.k!=='routerHostCall'||value.id!=='router_vector_json_validate'||value.args?.length!==1||value.compatibilityCore?.id!=='router-owned-json-update-v1'||value.compatibilityCore.sourceSha256!==BOUNDED_JSON_CORE_SHA256||value.compatibilityCore.symbol!=='crate::translation_json_core::json_validate')fail('actual source-bound bounded validation local required');return;}if(type?.kind==='bool'||type?.kind==='string')return scalar(type);const pointee=type?.rustReference?.kind==='shared'?type.rustReference.pointee:type;if(type?.rustReference&&type.rustReference.kind!=='shared'||!pointee||pointee.kind!=='data'||pointee.name!==own.ret.element.name||pointee.rustReference||pointee.rustOwnership||pointee.patternOwnershipRefusal||pointee.rustGenericIdentityUnresolved||pointee.rustBorrowingUnresolved)fail('actual canonical Json local required');return jsonDomain.element;}):checkedOwnedVectorTail(own,scalar);
  if(own.ret?.kind!=='array'||own.ret.rustSourceType!==true||own.ret.rustOwnership?.kind!=='owned'||own.ret.rustOwnership.source!=='Vec'||own.ret.patternOwnershipRefusal!==ret.patternOwnershipRefusal||own.ret.rustFixedArray||own.ret.rustReference||own.ret.rustGenericIdentityUnresolved||own.ret.rustBorrowingUnresolved||tail?.k!=='array'||tail.compatibilityCore?.id!=='router-core-vector-list-v1'||tail.type?.rustOwnership?.kind!=='owned'||tail.type.rustOwnership.source!=='Vec'||tail.type.patternOwnershipRefusal||tail.type.rustReference||tail.type.rustFixedArray||tail.type.rustGenericIdentityUnresolved||tail.type.rustBorrowingUnresolved||!sameType(own.ret,tail.type))fail('actual accepted qualified owned-vector list body required');
  const parameters=jsonDomain?.parameters??own.params.map((param,at)=>{if(!sameType(param.type,written.params[at].type))fail('actual source scalar parameter type differs');return scalar(param.type);});
  const element=jsonDomain?.element??scalar(own.ret.element);if(!jsonDomain&&(JSON.stringify(scalar(ret.element))!==JSON.stringify(element)||JSON.stringify(scalar(tail.type.element))!==JSON.stringify(element)))fail('actual original primitive source/checked body differs');
  if(lowered.own?.k!=='fn'||lowered.own.params.length!==own.params.length||!jsonDomain&&!sameType(lowered.own.ret,own.ret))fail('actual target lowering portable signature differs');
  // A physical file's locally rooted inline views omit its external-module
  // prefix. Use this SAME fresh forward invocation's genuine graph view and
  // full module identity; reconstructing a guessed prefix would lose that join.
  const modulePath=original.qualifiedName.split('.').slice(0,-1),scopes=result.sourceScopes.filter(scope=>scope.source===original.source&&JSON.stringify(scope.module)===JSON.stringify(modulePath));if(scopes.length!==1||scopes[0].sha256!==hash(source)||scopes[0].sourceView?.sourcePath!==original.source)fail('actual original Rust module view differs');
  const functions=originalModuleViewItems(scopes[0].sourceView,source).filter(item=>item.term==='fn'&&item.name===original.name&&item.start===captured.span.start&&item.end===captured.span.end);if(functions.length!==1)fail('actual original Rust function span differs');const fn=functions[0];
  const writtenReturn=JSON.parse(JSON.stringify(ret));
  profiles.set(binding.javascriptName,{binding:{...binding},parameters,type:jsonDomain?.type??'vec:'+element.name,element,...(jsonDomain?{kind:jsonDomain.kind}:{}),original:{path:original.source,source,sha256:hash(source),qualifiedName:original.qualifiedName,carrierSpan:{...original.span},span:[fn.start,fn.end],functionSource:source.slice(fn.start,fn.end),signature:{params:JSON.parse(JSON.stringify(written.params)),returns:writtenReturn}},forward:{javascript:result.javascript,typescript:result.typescript,census:sourceCensus,sourceScopes:result.sourceScopes.map(scope=>({source:scope.source,module:[...scope.module],sha256:scope.sha256}))}});
 }
 // The map is confined to one native traversal, never retained in a context or
 // accepted from a caller. Source handles re-run this complete producer on read.
 return profiles;}catch(error){profiles.clear();throw error;}finally{result=null;}
}
function arrayType(ts,type,element){
 if(ts.isTypeOperatorNode(type)&&type.operator===ts.SyntaxKind.ReadonlyKeyword)type=type.type;
 if(!ts.isArrayTypeNode(type)||type.elementType.kind!==(element.kind==='bool'?ts.SyntaxKind.BooleanKeyword:element.kind==='float'?ts.SyntaxKind.NumberKeyword:['text','static-text'].includes(element.kind)?ts.SyntaxKind.StringKeyword:ts.SyntaxKind.BigIntKeyword))fail('actual paired primitive array return type differs');
}
function integerText(ts,node){
 let negative=false;if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken){negative=true;node=node.operand;}
 if(!ts.isBigIntLiteral(node))fail('only bool/integer literals are implemented');let value;try{value=BigInt(node.text.replace(/n$/u,'').replaceAll('_',''));}catch{fail('invalid literal integer');}if(negative)value=-value;return value.toString();
}
function boundedInteger(text,element){const value=BigInt(text),width=BigInt(element.bits),low=element.signed?-(1n<<(width-1n)):0n,high=(1n<<(element.signed?width-1n:width))-1n;if(value<low||value>high)fail('new JavaScript integer is outside actual original primitive bounds');return text;}
export function checkOriginalOwnedVectorFunction(path,declaration,analysis,paired,name,resolveImport){
 const profile=analysis.vectorProfiles?.get(declaration.name?.text);if(!profile||profile.kind==='json-vector')return null;const {ts,file,checker,source}=analysis;
 const symbol=checker.getSymbolAtLocation(declaration.name);if(!symbol||symbol.declarations?.length!==1||symbol.declarations[0]!==declaration)fail('actual original JavaScript function binding differs');
 if(!paired||!paired.declaration.type||declaration.typeParameters?.length||declaration.asteriskToken)fail('complete actual TypeScript pair required');arrayType(ts,paired.declaration.type,profile.element);
 const input=vectorSourceParameters({ts,checker,declaration,paired,profile});
 const body=readOwnedVectorConditionFlow({ts,checker,inputs:input.inputs,statements:consumeVectorParameterPrelude(analysis,declaration,input.params,resolveImport),readLiteral:node=>{if(['text','static-text'].includes(profile.element.kind))return ownedVectorTextLiteral(ts,node);if(profile.element.kind==='float')return ownedVectorF64Literal(ts,node);if(profile.element.kind==='bool'){if(![ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(node.kind))fail('actual bool element requires bool literal');return {kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword};}return {kind:'integer',value:boundedInteger(integerText(ts,node),profile.element)};},makeReturn:items=>{for(const item of items)if(item.kind==='vector-input'&&item.type!==profile.element.name)fail('vector input element differs from actual returned scalar domain');return {kind:'owned-vector-list',type:profile.type,element:profile.element,items,root:null};}});
 return {kind:'owned-function',name,javascript:declaration.name.text,exported:!!declaration.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword),params:input.params,returns:profile.type,resultRoot:null,body,source:{path,source,span:[declaration.getStart(file),declaration.end]},hostCalls:[],pairedSource:{path:paired.pair.typescript.path,source:paired.pair.typescript.source,span:paired.evidence.typescriptSpan,parameters:paired.evidence.parameters,locals:paired.evidence.locals,returnSpan:paired.evidence.returnSpan,erasure:paired.pair.erasure.edits},vectorOrigin:profile};
}
export function emitOwnedVectorCandidateLiteral(value,rust){
 if(value.kind!=='owned-vector-list'||value.type!=='vec:'+value.element.name||!names.includes(value.element.name)||!Array.isArray(value.items)||value.items.length>4096)fail('checked vector literal differs');
 const items=value.items.map(item=>{if(item.kind==='vector-input'){if(item.type!==value.element.name||typeof item.name!=='string'||typeof item.rust!=='string')fail('checked vector input differs');return rust?(item.type==='text-owned'?'<::std::string::String as ::std::clone::Clone>::clone(&'+item.rust+')':item.rust):item.name;}if(['text','static-text'].includes(value.element.kind))return emitOwnedVectorText(item,rust,value.element.kind==='static-text');if(value.element.kind==='float')return emitOwnedVectorF64(item,rust);if(value.element.kind==='bool'){if(item.kind!=='bool'||typeof item.value!=='boolean')fail('checked bool differs');return String(item.value);}if(item.kind!=='integer'||typeof item.value!=='string')fail('checked integer differs');const text=boundedInteger(item.value,value.element);return rust?text+'_'+value.element.name:text+'n';});
 return (rust?'crate::translation_core::vec![':'[')+items.join(', ')+']';
}
export function evaluateOwnedVectorCandidateLiteral(value,scope){return value.items.map(item=>item.kind==='vector-input'?scope.get(item.name):['text','static-text'].includes(value.element.kind)?ownedVectorTextValue(item):value.element.kind==='float'?evaluateOwnedVectorF64(item):value.element.kind==='bool'?item.value:BigInt(boundedInteger(item.value,value.element)));}

import {readOwnedVectorConditionFlow} from './owned-vector-condition-flow.mjs';

import {checkedOwnedVectorTail} from './owned-vector-origin-tail.mjs';

import {vectorSourceParameters} from './owned-vector-source-parameters.mjs';

import {ownedVectorF64Literal,emitOwnedVectorF64,evaluateOwnedVectorF64} from './owned-vector-f64-literal.mjs';

import {ownedVectorTextLiteral,emitOwnedVectorText,ownedVectorTextValue} from './owned-vector-text-literal.mjs';

import {originalJsonVectorDomain} from './owned-vector-json-native.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';

import {consumeVectorParameterPrelude} from './owned-vector-reinput-prefix.mjs';

// Detached DATA from the same fresh full project invocation, shared only among
// this invocation's candidate rows. Stored copies still require full reissue.
export function ownedVectorOriginalProjectCensus(result){
 const key=row=>JSON.stringify([row.source,row.name,row.term??'fn']);return {executable:result.meta.executable.map(key).sort(),refused:result.meta.refused.map(key).sort(),methods:(result.meta.checkedMethods??[]).map(key).sort(),generatedMethods:(result.meta.checkedGeneratedMethods??[]).map(key).sort()};
}

import {checkedOwnedJsonVectorTail} from './owned-vector-json-origin-tail.mjs';
import {BOUNDED_JSON_CORE_SHA256} from '../bounded-json-core-source-data.mjs';
