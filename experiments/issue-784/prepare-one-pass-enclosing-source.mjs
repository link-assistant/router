// Uninstalled diagnostic source proposal. No original API or receiving file is
// changed. A source equation is DATA, not namespace or executable authority.
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const pins={
  context:'676dd12bc5e324d8c4785b477c49486c8c43b9f9c3467483e0fc261e6d527e7e',
  moduleBindings:'b096c3c1585da4f8e42ebf55c826882d299c5ec5dc62527e3a20d842b50a2c2f',
};
const newFacts=`
// Separate fresh issuer/consumer transaction. A caller cannot supply a token.
// The old token API retains its original independent reproof schedule.
export function freshDeriveEnclosingNamespaceEffectFacts(context,deriveContext,module,item){
 const token=proveDeriveEnclosingNamespaceEffect(context,deriveContext,module,item);
 requireContextNative();
 const state=privateGet(effects,token);
 if(!state)fail('fresh enclosing effect has no private issuer state');
 return state.facts;
}
`;

export function prepareOnePassEnclosingSources({context,moduleBindings}){
  for(const [name,source]of Object.entries({context,moduleBindings}))if(typeof source!=='string'||hash(source)!==pins[name])throw Error('Complete original enclosing source differs: '+name);
  const ts=ownershipCompiler();
  if(ts.version!=='5.9.3')throw Error('Lockfile TypeScript 5.9.3 required');
  const parse=source=>{
    const file=ts.createSourceFile('complete-enclosing.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    if(file.parseDiagnostics.length)throw Error('Complete enclosing grammar differs');return file;
  };
  const original=parse(moduleBindings),selected=original.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='resolveEnclosingNamespaceModuleBindings');
  if(selected.length!==1)throw Error('One complete original enclosing resolver required');
  const resolver=moduleBindings.slice(selected[0].getStart(original),selected[0].end);
  const result=createRulePipeline([
    {phase:'language',rules:[exactLiteralSubstitutionRule('one-pass-enclosing:fresh-effect-facts',
      'const effect=proveDeriveEnclosingNamespaceEffect(deriveBangContext,deriveContext,module,item),facts=deriveEnclosingNamespaceEffectFacts(effect,deriveBangContext,deriveContext,module,item);',
      'const facts=freshDeriveEnclosingNamespaceEffectFacts(deriveBangContext,deriveContext,module,item);')]},
    {phase:'repository',rules:[exactLiteralSubstitutionRule('one-pass-enclosing:separate-resolver-name',
      'export function resolveEnclosingNamespaceModuleBindings(',
      'export function resolveFreshEnclosingNamespaceModuleBindings(')]},
  ]).run(resolver);
  const expanded=result.value,expandedFile=parse(expanded),parts=[];
  // Compact only this new private copy. Native leaves retain every literal and
  // punctuation byte; the whole native AST/token tree must still match.
  function terminals(node,file){
    const children=node.getChildren(file);
    if(children.length)for(const child of children)terminals(child,file);
    else {const text=node.getText(file);if(text)parts.push(text);}
  }
  terminals(expandedFile,expandedFile);
  const compact=parts.join(' '),compactFile=parse(compact);
  const shape=(node,file)=>[node.kind,node.getChildren(file).map(child=>shape(child,file)),
    node.getChildCount(file)===0?node.getText(file):null];
  if(JSON.stringify(shape(expandedFile,expandedFile))!==JSON.stringify(shape(compactFile,compactFile)))throw Error('Compacted complete enclosing AST or token spelling differs');
  const contextAfter=context+newFacts;
  const moduleAfter=moduleBindings+"\nimport {freshDeriveEnclosingNamespaceEffectFacts} from './derive-enclosing-namespace-context.mjs';\n"+compact+'\n';
  for(const source of [contextAfter,moduleAfter]){
    parse(source);if(source.split('\n').length>=1000)throw Error('Complete enclosing source line bound');
  }
  const rows=[
    {path:'tools/translation/derive-enclosing-namespace-context.mjs',before:context,middle:context,after:contextAfter},
    {path:'tools/translation/module-bindings.mjs',before:moduleBindings,middle:moduleBindings,after:moduleAfter},
  ];
  const equations=transportConcreteSourcePhases(rows.map(({before,middle,after})=>({before,middle,after,language:'JavaScript'})));
  return {schema:'one-pass-enclosing-source-proposal-v1',rows:rows.map((row,at)=>({...row,equation:equations[at]})),
    resolver,expanded,compact,trace:result.trace,originalPublicFunctionsChanged:false,
    sourceOrOwnerVerdictsCached:false,productionConsumerChanged:false,
    receivingQualified:false,performanceQualified:false,semanticAuthority:false};
}
