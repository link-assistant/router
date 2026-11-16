// Original syntax/effect observations only. No macro or attribute owner permit.
import {captureOriginalNamespaceAttributeExpression,originalNamespaceAttributeExpressionFacts} from './original-namespace-parser.mjs';

/** Every call captures and rechecks a genuine original equality-expression. */
export function captureOriginalDocExpressionSourceEffects(options){
 const token=captureOriginalNamespaceAttributeExpression(options),facts=originalNamespaceAttributeExpressionFacts(token,options);if(facts.source.attributeName!=='doc')throw new TypeError('Original documentation equality expression required');
 const frontiers=[],pending=[facts.ast];let visited=0;while(pending.length){const node=pending.pop();if(++visited>200000)throw new TypeError('Original documentation effect source-cell bound');if(node===null||typeof node!=='object')continue;
  if(['OpaqueBang','Attribute','MacroDefinition'].includes(node.kind))frontiers.push({kind:node.kind,span:{start:node.span.start,end:node.span.end},position:node.kind==='OpaqueBang'?node.fields.position:null,originalOwnerResolved:false,globalEffectsClosed:false});
  if(Array.isArray(node))for(let at=node.length-1;at>=0;at--)pending.push(node[at]);else for(const value of Object.values(node))pending.push(value);
 }
 originalNamespaceAttributeExpressionFacts(token,options);return {schema:'original-doc-expression-source-effects-v1',token,facts,frontiers,visited,completePositiveSyntaxTraversed:true,syntacticMacroFrontierFound:frontiers.length>0,attributeOwnerResolved:false,macroOwnerResolved:false,nativeVisitorConfinementQualified:false,globalExportsClosed:false,sourceAuthority:false,semanticAuthority:false,typeAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};
}

export {documentationArgumentMayExportMacros} from './documentation-argument-uncertainty.mjs';
