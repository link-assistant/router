// Whole-module input-boundary migration proposals, never installed source.
// Syntax hints select candidates only; fresh complete private re-entry is mandatory.
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../primitive-bitwise-types.mjs';
import {ownedPlainData,ownedSourcePath,ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './owned-outcome-source.mjs';
import {createOwnedOutcomeContext,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript} from './owned-outcome.mjs';
import {createOwnedCancellationContext,translateOwnedCancellationJavaScript,translateOwnedCancellationTypeScript} from './owned-cancellation.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Wide slice boundary proposal: '+message);};
const families={outcome:{create:createOwnedOutcomeContext,javascript:translateOwnedOutcomeJavaScript,typescript:translateOwnedOutcomeTypeScript},cancellation:{create:createOwnedCancellationContext,javascript:translateOwnedCancellationJavaScript,typescript:translateOwnedCancellationTypeScript}};
function syntaxPlan(source,path,runtimeRoot){
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.mjs')?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete original syntax required');
 let work=0;const visit=(node,depth=0)=>{if(++work>100000||depth>160)fail('complete source syntax budget');ts.forEachChild(node,child=>visit(child,depth+1));};visit(file);
 const target=runtimeRoot+'/primitive-operator-runtime.mjs',aliasNames=new Map(),namespaceNames=new Set(),inputNames=new Set(),base64Names=new Set(),allNames=new Set();
 const relative=specifier=>typeof specifier==='string'&&specifier.startsWith('.')?posix.normalize(posix.join(posix.dirname(path),specifier)):null;
 for(const statement of file.statements){
  if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier))continue;const actual=relative(statement.moduleSpecifier.text),bindings=statement.importClause?.namedBindings;
  if(bindings&&ts.isNamedImports(bindings))for(const entry of bindings.elements){const name=entry.propertyName?.text??entry.name.text;allNames.add(entry.name.text);if(actual===target){const row=PRIMITIVE_BITWISE_TYPES.find(row=>row.alias===name);if(row)aliasNames.set(entry.name.text,row.name);if(name==='primitiveSliceInput'&&!entry.isTypeOnly&&!statement.importClause.isTypeOnly)inputNames.add(entry.name.text);}if(actual===runtimeRoot+'/base64-runtime.mjs'&&name==='base64ResultInput'&&!entry.isTypeOnly&&!statement.importClause.isTypeOnly)base64Names.add(entry.name.text);}
  if(bindings&&ts.isNamespaceImport(bindings)){allNames.add(bindings.name.text);if(actual===target)namespaceNames.add(bindings.name.text);}if(statement.importClause?.name)allNames.add(statement.importClause.name.text);
 }
 const names=node=>{if(ts.isIdentifier(node))allNames.add(node.text);ts.forEachChild(node,names);};names(file);
 let helper='__ro_primitiveSliceInput';for(let at=0;allNames.has(helper);at++){if(at>=4096)fail('bounded new import name required');helper='__ro_primitiveSliceInput_'+at;}
 const unwrap=node=>{let depth=0;while(node&&ts.isParenthesizedTypeNode(node)){if(++depth>32)fail('bounded written input type required');node=node.type;}return node;};
 function hint(type){
  type=unwrap(type);if(!type||!ts.isTypeOperatorNode(type)||type.operator!==ts.SyntaxKind.ReadonlyKeyword)return null;const array=unwrap(type.type);if(!ts.isArrayTypeNode(array))return null;const element=unwrap(array.elementType);let name=null;
  if(ts.isImportTypeNode(element)&&!element.isTypeOf&&!element.typeArguments?.length&&!element.attributes&&ts.isLiteralTypeNode(element.argument)&&ts.isStringLiteral(element.argument.literal)&&relative(element.argument.literal.text)===target&&element.qualifier&&ts.isIdentifier(element.qualifier))name=PRIMITIVE_BITWISE_TYPES.find(row=>row.alias===element.qualifier.text)?.name??null;
  if(ts.isTypeReferenceNode(element)&&!element.typeArguments?.length){if(ts.isIdentifier(element.typeName))name=aliasNames.get(element.typeName.text)??null;else if(ts.isQualifiedName(element.typeName)&&ts.isIdentifier(element.typeName.left)&&namespaceNames.has(element.typeName.left.text))name=PRIMITIVE_BITWISE_TYPES.find(row=>row.alias===element.typeName.right.text)?.name??null;}
  return name&&!['u64','i64'].includes(name)?name:null;
 }
 const edits=[],functions=[];let added=0,existing=0;
 for(const declaration of file.statements){
  if(!ts.isFunctionDeclaration(declaration)||!declaration.body||!declaration.name)continue;if(functions.length>=4096||declaration.parameters.length>32)fail('complete input function/parameter bound');const parameters=[];
  for(const parameter of declaration.parameters){const domain=hint(parameter.type??ts.getJSDocType(parameter));if(!domain)continue;if(!ts.isIdentifier(parameter.name)||parameter.dotDotDotToken||parameter.initializer||parameter.questionToken)fail('ordinary written fixed-width slice parameter required');parameters.push({name:parameter.name.text,domain,span:[parameter.getStart(file),parameter.end]});}
  if(!parameters.length)continue;const statements=declaration.body.statements;let offset=0;
  // This only selects the insertion position. The private checker authenticates
  // every consumed Base64 and slice prefix in the complete proposed source.
  while(offset<statements.length){const row=statements[offset],value=ts.isExpressionStatement(row)?row.expression:null;if(!value||!ts.isBinaryExpression(value)||value.operatorToken.kind!==ts.SyntaxKind.EqualsToken||!ts.isIdentifier(value.left)||!ts.isCallExpression(value.right)||!ts.isIdentifier(value.right.expression)||!base64Names.has(value.right.expression.text))break;offset++;}
  const matches=(parameter,statement)=>{const value=statement&&ts.isExpressionStatement(statement)?statement.expression:null;return !!value&&ts.isBinaryExpression(value)&&value.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isIdentifier(value.left)&&value.left.text===parameter.name&&ts.isCallExpression(value.right)&&!value.right.questionDotToken&&!value.right.typeArguments?.length&&ts.isIdentifier(value.right.expression)&&inputNames.has(value.right.expression.text)&&value.right.arguments.length===2&&ts.isIdentifier(value.right.arguments[0])&&value.right.arguments[0].text===parameter.name&&ts.isStringLiteral(value.right.arguments[1])&&value.right.arguments[1].text===parameter.domain;};
  const complete=parameters.every((parameter,index)=>matches(parameter,statements[offset+index]));if(complete){existing+=parameters.length;functions.push({name:declaration.name.text,parameters,alreadyGuarded:true});continue;}
  const first=statements[offset],value=first&&ts.isExpressionStatement(first)?first.expression:null;if(value&&ts.isBinaryExpression(value)&&ts.isIdentifier(value.left)&&parameters.some(row=>row.name===value.left.text))fail('existing partial or different input contract requires explicit reconciliation');
  const at=offset?statements[offset-1].end:declaration.body.getStart(file)+1;if(!offset&&source[at-1]!=='{')fail('actual complete function opening required');const replacement='\n'+parameters.map(row=>' '+row.name+' = '+helper+'('+row.name+', '+JSON.stringify(row.domain)+');').join('\n')+'\n';edits.push({span:[at,at],expected:'',replacement});added+=parameters.length;functions.push({name:declaration.name.text,parameters,alreadyGuarded:false});
 }
 if(!functions.length)fail('no supported explicit fixed-width slice candidate');
 let importAt=source.charCodeAt(0)===0xfeff?1:0;if(source.startsWith('#!',importAt)){const end=source.indexOf('\n',importAt);if(end<0)fail('complete hashbang line required');importAt=end+1;}
 const specifier=posix.relative(posix.dirname(path),target),module=specifier.startsWith('.')?specifier:'./'+specifier;
 return {edits,functions,added,existing,importEdit:added?{span:[importAt,importAt],expected:'',replacement:'import {primitiveSliceInput as '+helper+'} from '+JSON.stringify(module)+';\n'}:null};
}
export function proposeOwnedWideSliceInputBoundaries(data,options){
 const original=ownedPlainData(data),request=ownedPlainData(options);if(Object.keys(request).length!==2||!Object.hasOwn(request,'sourcePath')||!Object.hasOwn(request,'family')||!Object.hasOwn(families,request.family)||original.primitiveOperators!==true)fail('explicit source path, owned family and actual primitive profile required');
 const {sourcePath,family}=request;ownedSourcePath(sourcePath);const kind=sourcePath.endsWith('.mjs')?'javascript':/\.(?:mts|ts)$/u.test(sourcePath)?'typescript':null;if(!kind)fail('explicit JavaScript or TypeScript module required');
 const rows=original.files.filter(row=>row.path===sourcePath);if(rows.length!==1||typeof rows[0].source!=='string'||Buffer.byteLength(rows[0].source)>8388608)fail('one complete bounded original source module required');const before=rows[0].source,contexts=[],selected=families[family];
 return withCompleteSourceClosingFence(()=>{
  const baseline=selected.create(original);contexts.push(baseline);if(ownedCoreSourceDataForFamily(family,baseline).files.find(row=>row.path===sourcePath)?.source!==before)fail('actual current source differs');let plan,after,current,checked;
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'owned-slice:select-candidate-prefixes-from-the-entire-original-native-syntax',apply:()=>{plan=syntaxPlan(before,sourcePath,original.runtimeRoot);const concrete=transportConcreteSyntaxSource(before,{language:kind==='javascript'?'JavaScript':'TypeScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==before)fail('complete original CST inverse differs');return concrete;}},{id:'owned-slice:substitute-complete-input-prefixes-through-CST-and-repository-import-rules',apply:concrete=>{const proposal=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'language:insert-only-complete-source-boundary-prefix-proposals',edits:plan.edits}],repositoryRules:[{id:'router:import-the-existing-qualified-primitive-runtime',edits:plan.importEdit?[plan.importEdit]:[]}]});after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(proposal.value)).source;return proposal.trace;}},{id:'owned-slice:reissue-the-entire-proposed-module-in-a-fresh-private-context',apply:trace=>{current=selected.create({...original,files:original.files.map(row=>row.path===sourcePath?{...row,source:after}:row)});contexts.push(current);checked=selected[kind](after,{context:current,sourcePath});return trace;}}]},
   {phase:'repository',rules:[{id:'router:retain-explicit-input-contract-change-and-all-original-source-inverses',apply:substitutionTrace=>{const history=transportConcreteSourceEquations([{before,after,language:kind==='javascript'?'JavaScript':'TypeScript'}])[0];if(history.inverse!==before)fail('complete original module inverse differs');return {schema:'owned-wide-slice-input-boundary-proposal-v1',family,sourcePath,files:[{path:sourcePath,before,after,inverse:before,history}],sourceInputs:original.files,functions:plan.functions,addedGuards:plan.added,existingGuards:plan.existing,substitutionTrace,program:checked.program,meta:checked.meta,rustCandidate:checked.rust,typescript:checked.typescript,inputEnvelopeChanged:plan.added>0,originalInputContractEquivalent:plan.added===0,sourceInstalled:false,nativeInstalled:false,nativeFreshnessQualified:false,productionSelected:false,runtimeParity:false,wholeRouterSynchronization:false,sourceAuthority:false,semanticAuthority:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};}}]},
  ]).run(null);return {...run.value,ruleTrace:run.trace};
 },[()=>{if(contexts[0])requireCurrentForFamily(family,contexts[0]);},()=>{if(contexts[1])requireCurrentForFamily(family,contexts[1]);},()=>{contexts.length=0;}]);
}
// Select concrete issuer functions; public family names cannot create a context.
import {ownedCoreSourceData as cancellationData,requireOwnedCoreSourceCurrent as cancellationCurrent} from './owned-cancellation-source.mjs';
const ownedCoreSourceDataForFamily=(family,context)=>family==='outcome'?ownedCoreSourceData(context):cancellationData(context);
const requireCurrentForFamily=(family,context)=>family==='outcome'?requireOwnedCoreSourceCurrent(context):cancellationCurrent(context);
