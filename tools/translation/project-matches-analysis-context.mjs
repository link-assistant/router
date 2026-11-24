// A private association within one project analysis. Each context retains its
// independent original-source, namespace and method checks.
import {captureOriginalMacroModules,originalMacroModules} from './original-macro-module-context.mjs';
import {createEnclosingMatchesMacroContext,createMatchesMacroContext,isMatchesMacroContext} from './matches-macro-context.mjs';

const parents=new WeakMap();

export function createProjectMatchesMacroContexts({modules,compilationProfile=null,
 deriveDependencies=null,cargoEditionContext=null}={}){
 const snapshot=captureOriginalMacroModules({modules,compilationProfile});
 const original=originalMacroModules(snapshot);
 // Capture before either constructor runs. A later caller mutation cannot
 // change the source, profile or dependencies selected for the method context.
 const options=Object.freeze({modules:original.modules,
  compilationProfile:original.compilationProfile,deriveDependencies,cargoEditionContext});
 const parser=createEnclosingMatchesMacroContext(options);
 let complete=null;
 return Object.freeze({parser,methods(){
  if(complete===null){
   const context=createMatchesMacroContext(options);
   parents.set(context,parser);complete=context;
  }
  return complete;
 }});
}

// Identity alone grants no source or semantic authority. Consumers must first
// validate both original parser and method facts through their private issuers.
export function isProjectMatchesAnalysisPair(parser,methods){
 return isMatchesMacroContext(parser)&&isMatchesMacroContext(methods)
  &&parents.get(methods)===parser;
}
