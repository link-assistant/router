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
  const jsonValueReturn=ret?.kind==='data'&&!ret.rustReference&&!ret.rustOwnership&&!ret.patternOwnershipRefusal&&!ret.rustGenericIdentityUnresolved&&!ret.rustBorrowingUnresolved;
  const jsonScalarReturn=!!ret&&!ret.rustReference&&!ret.rustOwnership&&!ret.patternOwnershipRefusal&&!ret.rustGenericIdentityUnresolved&&!ret.rustBorrowingUnresolved&&(ret.kind==='bool'||ret.kind==='fixed'&&ret.bits===64&&['u64','i64'].includes(ret.rustPrimitiveName)&&ret.signed===(ret.rustPrimitiveName==='i64'));
  if(own.k!=='fn'||own.async||own.params.length!==written.params.length||own.params.length>32||!jsonValueReturn&&!jsonScalarReturn&&(ret?.kind!=='array'||ret.rustSourceType!==true||ret.rustOwnership?.kind!=='owned'||ret.rustOwnership.source!=='Vec'||ret.rustFixedArray||ret.rustReference||ret.patternOwnershipRefusal!=='ownership-bearing Vec type'||ret.rustGenericIdentityUnresolved||ret.rustBorrowingUnresolved))fail('actual bounded source-owned Vec or canonical JSON value signature required');
  // The original parser marks Vec as unsafe for ownership-erasing patterns.
  // This exact marker is supported only with the same checked owned-list body;
  // arbitrary refusal markers and every borrowed/fixed-array signature refuse.
  const lowered=original.lower(),expressionVector=hasPrimitiveExpressionVectorRuntime(files,data)?originalPrimitiveExpressionVectorDomain(own,lowered):null,primitiveDomain=jsonScalarReturn?(hasPrimitiveExpressionVectorRuntime(files,data)?originalPrimitiveScalarVectorLocalDomain:originalPrimitiveScalarDomain)(own,lowered):null,jsonDomain=expressionVector??primitiveDomain??(jsonValueReturn?originalJsonOwnedValueDomain(own,lowered):jsonScalarReturn?originalJsonScalarDomain(own,lowered):originalJsonVectorDomain(own,lowered));
  const tail=expressionVector?checkedPrimitiveExpressionVectorTail(own):primitiveDomain?.vectorLocals===true?checkedPrimitiveScalarVectorLocals(own):jsonDomain?(jsonValueReturn?checkedOwnedJsonValueTail:jsonScalarReturn?(declaration,check)=>checkedOwnedJsonScalarTail(declaration,check,jsonDomain.canonicalSourceName):checkedOwnedJsonVectorTail)(own,(type,value)=>{if(type?.kind==='unit'){if(primitiveDomain&&value?.k==='call'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved)return;if(value?.k!=='routerHostCall'||value.id!=='router_vector_json_validate'||value.args?.length!==1||value.compatibilityCore?.id!=='router-owned-json-update-v1'||value.compatibilityCore.sourceSha256!==BOUNDED_JSON_CORE_SHA256||value.compatibilityCore.symbol!=='crate::translation_json_core::json_validate')fail('actual source-bound bounded validation local required');return;}if(type?.kind==='string'&&!type.rustReference&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved)return {name:'str',kind:'borrowed-text'};if(type?.kind==='bool'||type?.kind==='string'||type?.kind==='fixed')return scalar(type);const optional=originalJsonVectorOptionPayload(own,lowered,type);if(optional)return {name:optional,kind:'standard-option-payload'};const pointee=type?.rustReference?.kind==='shared'?type.rustReference.pointee:type;if(type?.rustReference&&type.rustReference.kind!=='shared'||!pointee||pointee.kind!=='data'||pointee.name!==(jsonScalarReturn?jsonDomain.canonicalSourceName:(jsonValueReturn?own.ret:own.ret.element).name)||pointee.rustReference||pointee.rustOwnership||pointee.patternOwnershipRefusal||pointee.rustGenericIdentityUnresolved||pointee.rustBorrowingUnresolved)fail('actual canonical Json local required');return jsonDomain.element;}):checkedOwnedVectorTail(own,scalar);
  if(expressionVector){if(!sameType(own.ret,ret)||!sameType(tail?.type,own.ret))fail('actual complete primitive Vec source signature/body differs');}else if(jsonScalarReturn){if(!jsonDomain||!['json-scalar','primitive-scalar'].includes(jsonDomain.kind)||!sameType(own.ret,ret)||!sameType(tail?.type,own.ret))fail('actual complete JSON-input primitive signature/body differs');}else if(jsonValueReturn){if(!jsonDomain||jsonDomain.kind!=='json-value'||!sameType(own.ret,ret)||!sameType(tail?.type,own.ret))fail('actual complete canonical owned JSON signature/body differs');}else if(own.ret?.kind!=='array'||own.ret.rustSourceType!==true||own.ret.rustOwnership?.kind!=='owned'||own.ret.rustOwnership.source!=='Vec'||own.ret.patternOwnershipRefusal!==ret.patternOwnershipRefusal||own.ret.rustFixedArray||own.ret.rustReference||own.ret.rustGenericIdentityUnresolved||own.ret.rustBorrowingUnresolved||tail?.k!=='array'||tail.compatibilityCore?.id!=='router-core-vector-list-v1'||tail.type?.rustOwnership?.kind!=='owned'||tail.type.rustOwnership.source!=='Vec'||tail.type.patternOwnershipRefusal||tail.type.rustReference||tail.type.rustFixedArray||tail.type.rustGenericIdentityUnresolved||tail.type.rustBorrowingUnresolved||!sameType(own.ret,tail.type))fail('actual accepted qualified owned-vector list body required');
  const parameters=jsonDomain?.parameters??own.params.map((param,at)=>{if(!sameType(param.type,written.params[at].type))fail('actual source scalar parameter type differs');return scalar(param.type);});
  const element=jsonDomain?.element??scalar(own.ret.element);if(!jsonDomain&&(JSON.stringify(scalar(ret.element))!==JSON.stringify(element)||JSON.stringify(scalar(tail.type.element))!==JSON.stringify(element)))fail('actual original primitive source/checked body differs');
  if(lowered.own?.k!=='fn'||lowered.own.params.length!==own.params.length||!jsonDomain&&!sameType(lowered.own.ret,own.ret))fail('actual target lowering portable signature differs');
  // A physical file's locally rooted inline views omit its external-module
  // prefix. Use this SAME fresh forward invocation's genuine graph view and
  // full module identity; reconstructing a guessed prefix would lose that join.
  const modulePath=original.qualifiedName.split('.').slice(0,-1),scopes=result.sourceScopes.filter(scope=>scope.source===original.source&&JSON.stringify(scope.module)===JSON.stringify(modulePath));if(scopes.length!==1||scopes[0].sha256!==hash(source)||scopes[0].sourceView?.sourcePath!==original.source)fail('actual original Rust module view differs');
  const functions=originalModuleViewItems(scopes[0].sourceView,source).filter(item=>item.term==='fn'&&item.name===original.name&&item.start===captured.span.start&&item.end===captured.span.end);if(functions.length!==1)fail('actual original Rust function span differs');const fn=functions[0];
  const writtenReturn=JSON.parse(JSON.stringify(ret));
  profiles.set(binding.javascriptName,{binding:{...binding},parameters,type:jsonDomain?.type??'vec:'+element.name,element,...(jsonDomain?{kind:jsonDomain.kind,...(jsonDomain.vectorLocals===true?{vectorLocals:true}:{})}:{}),original:{path:original.source,source,sha256:hash(source),qualifiedName:original.qualifiedName,carrierSpan:{...original.span},span:[fn.start,fn.end],functionSource:source.slice(fn.start,fn.end),signature:{params:JSON.parse(JSON.stringify(written.params)),returns:writtenReturn}},forward:{javascript:result.javascript,typescript:result.typescript,census:sourceCensus,sourceScopes:result.sourceScopes.map(scope=>({source:scope.source,module:[...scope.module],sha256:scope.sha256}))}});
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
 const profile=analysis.vectorProfiles?.get(declaration.name?.text);if(!profile||['json-vector','json-value','json-scalar','primitive-scalar','primitive-expression-vector'].includes(profile.kind))return null;const {ts,file,checker,source}=analysis;
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

import {originalJsonVectorDomain,originalJsonOwnedValueDomain,originalJsonScalarDomain,originalPrimitiveScalarDomain,originalJsonVectorOptionPayload} from './owned-vector-json-native.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';

import {consumeVectorParameterPrelude} from './owned-vector-reinput-prefix.mjs';

// Detached DATA from the same fresh full project invocation, shared only among
// this invocation's candidate rows. Stored copies still require full reissue.
export function ownedVectorOriginalProjectCensus(result){
 const key=row=>JSON.stringify([row.source,row.name,row.term??'fn']);return {executable:result.meta.executable.map(key).sort(),refused:result.meta.refused.map(key).sort(),methods:(result.meta.checkedMethods??[]).map(key).sort(),generatedMethods:(result.meta.checkedGeneratedMethods??[]).map(key).sort()};
}

import {checkedOwnedJsonVectorTail,checkedOwnedJsonValueTail,checkedOwnedJsonScalarTail} from './owned-source-call-origin-tail.mjs';
import {BOUNDED_JSON_CORE_SHA256} from '../bounded-json-core-source-data.mjs';

// Actual original/lowered signature observations; these are never permit tokens.
export function observeNativePrimitiveVectorDomain(own,lowered){
 if(own?.ret?.kind!=='array'||own.ret.element?.kind==='data')return null;
 const ret=own.ret,actual=lowered?.own;
 if(own.k!=='fn'||own.async||!Array.isArray(own.params)||own.params.length>32||ret.rustSourceType!==true||ret.rustOwnership?.kind!=='owned'||ret.rustOwnership.source!=='Vec'||ret.patternOwnershipRefusal!=='ownership-bearing Vec type'||ret.rustReference||ret.rustFixedArray||ret.rustGenericIdentityUnresolved||ret.rustBorrowingUnresolved||actual?.k!=='fn'||actual.params.length!==own.params.length||!sameType(ret,actual.ret))fail('actual original/lowered owned primitive vector signature required');
 const element=scalar(ret.element),parameters=own.params.map((row,index)=>{const source=scalar(row.type),target=scalar(actual.params[index].type);if(!sameType(row.type,actual.params[index].type)||JSON.stringify(source)!==JSON.stringify(target))fail('actual original/lowered primitive vector parameter differs');return source;});
 if(JSON.stringify(element)!==JSON.stringify(scalar(actual.ret.element)))fail('actual original/lowered primitive vector element differs');return {kind:'primitive-vector',type:'vec:'+element.name,element,parameters};
}
const jsonFamily=item=>['json-vector','json-value','json-scalar','primitive-scalar','primitive-expression-vector'].includes(item.vectorOrigin?.kind);
function normalizedVectorTree(tree,params){
 const names=new Map(params.map((row,index)=>[row.rust,index]));let cells=0;
 function visit(value,depth){if(++cells>20000||depth>64||!Array.isArray(value))fail('bounded complete primitive vector tree required');if(value[0]==='parameter'){if(value.length!==2||!names.has(value[1]))fail('actual primitive vector parameter origin required');return ['parameter',names.get(value[1])];}if(value[0]==='vector')return ['vector',value[1].map(row=>visit(row,depth+1))];return value.map(row=>Array.isArray(row)?visit(row,depth+1):row);}
 try{return visit(tree,0);}finally{names.clear();}
}
export function observeNativeProjectionTree(own,observation,lowered,targets){return observation.vectorOrigin.kind==='primitive-vector'?normalizedVectorTree(actualNativeVectorTree(own,observation),observation.params):observedNativeJsonVectorTree(own,observation,lowered,targets);}
export function requestedNativeProjectionTree(item){return jsonFamily(item)?requestedNativeJsonVectorTree(item):normalizedVectorTree(requestedNativeVectorTree(item),item.params);}
export function actualNativeProjectionTree(own,item,lowered){return jsonFamily(item)?actualNativeJsonVectorTree(own,item,lowered):normalizedVectorTree(actualNativeVectorTree(own,item),item.params);}
// Existing complete receiving source supplies spelling DATA, never a type.
export function nativeProjectionParameterProposals(source,path){
 const concrete=transportConcreteSyntaxSource(source,{language:'JavaScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete actual receiving spelling CST differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('actual receiving spelling syntax required');const result=new Map();
 for(const node of file.statements)if(ts.isFunctionDeclaration(node)&&node.name){const name=node.name.text;if(result.has(name)){result.set(name,null);continue;}if(node.parameters.length>32||node.parameters.some(row=>!ts.isIdentifier(row.name)||row.initializer||row.dotDotDotToken)){result.set(name,null);continue;}result.set(name,node.parameters.map(row=>row.name.text));if(result.size>4096)fail('bounded complete receiving spelling table required');}
 return result;
}
export function nativeProjectionParameters(own,domain,spelling=null){
 const ordinary=name=>typeof name==='string'&&/^[a-z][A-Za-z0-9_]*$/u.test(name)&&!['arguments','eval','await','yield'].includes(name),reserved=name=>/^__ro_vector_input_[0-9]+$/u.test(name);
 if(['primitive-vector','primitive-expression-vector'].includes(domain.kind)&&Array.isArray(spelling)&&spelling.length===own.params.length&&spelling.every(ordinary)&&new Set(spelling).size===spelling.length){if(own.params.some(row=>!ordinary(row.name)&&!reserved(row.name)))fail('existing spelling cannot admit an unknown native reserved binder');return spelling.map((name,index)=>({name,type:domain.parameters[index].name}));}
 const used=new Set(own.params.filter(row=>ordinary(row.name)).map(row=>row.name));
 try{return own.params.map((row,index)=>{let name=row.name;if(!ordinary(name)){if(!['primitive-vector','primitive-expression-vector'].includes(domain.kind)||!reserved(name))fail('ordinary native parameter or actual compiler vector binder required');name='native_input_'+index;let count=0;while(used.has(name))name='native_input_'+index+'_'+count++;used.add(name);}return {name,type:domain.parameters[index].name};});}finally{used.clear();}
}
/** Closed existing vector rules; the receiving checker independently owns ABI. */
export function projectNativePrimitiveVectorFunction(unit){
 let cells=0,leaves=0;const tick=depth=>{if(++cells>20000||depth>64)fail('bounded complete primitive vector source required');};
 const type=role=>role==='bool'?'boolean':role==='f64'?'number':['text-owned','str-static'].includes(role)?'string':/^[iu](?:8|16|32|64|128|size)$/u.test(role)?'bigint':fail('registered primitive vector domain required');
 if(unit.returns!=='vec:'+unit.element?.name||unit.kind!=='primitive-vector')fail('actual primitive vector element and return required');
 function condition(node,depth){tick(depth);if(node?.[0]==='bool'&&typeof node[1]==='boolean')return String(node[1]);if(node?.[0]==='parameter'&&unit.parameters[node[1]]?.type==='bool')return unit.parameters[node[1]].name;if(node?.[0]==='not')return '(!'+condition(node[1],depth+1)+')';if(['and','or'].includes(node?.[0]))return '('+condition(node[1],depth+1)+(node[0]==='and'?' && ':' || ')+condition(node[2],depth+1)+')';fail('closed actual bool vector condition required');}
 function element(node,depth){
  tick(depth);const [kind,value]=node;if(kind==='parameter'){const param=unit.parameters[value];if(!param||param.type!==unit.element.name)fail('identical actual vector element input required');return param.name;}
  if(kind==='bool'&&unit.element.kind==='bool'&&typeof value==='boolean')return String(value);
  if(kind==='integer'&&unit.element.kind==='integer'&&typeof value==='string'&&/^-?(?:0|[1-9][0-9]{0,39})$/u.test(value)){const integer=BigInt(value),bounds=vectorScalarBounds(unit.element.name);if(integer<bounds.minimum||integer>bounds.maximum)fail('literal exceeds its actual native vector element');return value+'n';}
  if(kind==='float'&&unit.element.kind==='float'){evaluateOwnedVectorF64({kind:'float',value});return value;}
  if(kind==='text'&&['text','static-text'].includes(unit.element.kind))return JSON.stringify(ownedVectorTextValue({kind:'text',value}));
  fail('closed actual primitive vector element required');
 }
 function body(node,depth){tick(depth);if(node?.[0]==='if')return '{\nif ('+condition(node[1],depth+1)+') '+body(node[2],depth+1)+' else '+body(node[3],depth+1)+'\n}';if(node?.[0]!=='vector'||!Array.isArray(node[1])||node[1].length>4096||++leaves>64)fail('complete bounded primitive vector return required');return '{ return ['+node[1].map(row=>element(row,depth+1)).join(', ')+']; }';}
 return 'export function '+unit.name+'('+unit.parameters.map(row=>row.name+': '+type(row.type)).join(', ')+'): readonly '+type(unit.element.name)+'[] '+body(unit.tree,0);
}
import {canonicalObservedNativeJsonVectorTree as observedNativeJsonVectorTree} from './owned-native-discovery-control.mjs';
import {canonicalActualNativeJsonVectorTree as actualNativeJsonVectorTree,canonicalRequestedNativeJsonVectorTree as requestedNativeJsonVectorTree} from './owned-vector-native-json-control.mjs';
import {actualNativeVectorTree,requestedNativeVectorTree} from './owned-vector-native-control.mjs';
import {vectorScalarBounds} from './owned-vector-parameter-values.mjs';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

import {hasPrimitiveExpressionVectorRuntime,originalPrimitiveExpressionVectorDomain,checkedPrimitiveExpressionVectorLocals as checkedPrimitiveExpressionVectorTail} from './owned-primitive-expression-vectors.mjs';

import {originalPrimitiveScalarVectorLocalDomain,checkedPrimitiveScalarVectorLocals} from './owned-primitive-scalar-vector-locals.mjs';
