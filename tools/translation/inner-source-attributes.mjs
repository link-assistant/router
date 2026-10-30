// Exact builtin crate attributes affect the prelude or documentation; they do
// not introduce arbitrary type names. Keep their original namespace conflict
// obligations and full source, without translating core/std implementations.
import {sourceItems} from './rust-structure.mjs';
import {originalModuleViewItems} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
export function builtinInnerSourceItem(item,source,view,profile){
  const actual=(view?originalModuleViewItems(view,source):sourceItems(source)).find(candidate=>candidate.start===item.start&&candidate.end===item.end);
  if(!actual)return null;
  const tokens=actual.tokens.filter(token=>token.type!=='comment');
  if(tokens[0]?.text!=='#'||tokens[1]?.text!=='!'||tokens[2]?.text!=='['||tokens.at(-1)?.text!==']')return null;
  const condition=itemConfiguration(tokens,profile);
  if(condition.status!=='active'||condition.attributes.length!==1)return null;
  const attribute=condition.attributes[0],name=tokens[3]?.text;
  if(['no_std','no_core','no_implicit_prelude'].includes(name)&&tokens.length===5)return {name,span:attribute.span,preludeControl:name};
  // The bounded official documentation grammar here needs literal key/value
  // entries only. Macro payloads and arbitrary documentation attributes carry.
  if(name!=='doc'||tokens[4]?.text!=='('||tokens.at(-2)?.text!==')')return null;
  const body=tokens.slice(5,-2);let at=0;
  while(at<body.length){
    if(!['html_root_url','html_logo_url','html_favicon_url','html_playground_url','issue_tracker_base_url'].includes(body[at]?.text)||body[at+1]?.text!=='='||body[at+2]?.type!=='string'||!body[at+2].text.startsWith('"'))return null;
    at+=3;if(at<body.length&&body[at++]?.text!==',')return null;
  }
  return body.length?{name,span:attribute.span,preludeControl:false}:null;
}

import {originalLiteralDocumentationInnerItem} from './registered-builtin-caller-attribute-source.mjs';

export function builtinLiteralDocumentationInnerSourceItem(item,source,view,profile){
  const actual=(view?originalModuleViewItems(view,source):sourceItems(source)).find(candidate=>candidate.start===item.start&&candidate.end===item.end);
  if(!actual)return null;
  const tokens=actual.tokens.filter(token=>token.type!=='comment');
  if(tokens[0]?.text!=='#'||tokens[1]?.text!=='!'||tokens[2]?.text!=='['||tokens.at(-1)?.text!==']')return null;
  const condition=itemConfiguration(tokens,profile);
  if(condition.status!=='active'||condition.attributes.length!==1)return null;
  const attribute=condition.attributes[0],name=tokens[3]?.text;
  if(['no_std','no_core','no_implicit_prelude'].includes(name)&&tokens.length===5)return {name,span:attribute.span,preludeControl:name};
  if(name==='doc'&&tokens.length===7&&tokens[4]?.text==='='&&tokens[5]?.type==='string'){const module={file:view?.sourcePath??'original-inner-literal-doc.rs',path:view?.modulePath??[],source,...(view?{sourceView:view}:{}),compilationProfile:profile},actual=originalLiteralDocumentationInnerItem(module,item);if(actual)return {name,span:attribute.span,preludeControl:false};return null;}
  // The bounded official documentation grammar here needs literal key/value
  // entries only. Macro payloads and arbitrary documentation attributes carry.
  if(name!=='doc'||tokens[4]?.text!=='('||tokens.at(-2)?.text!==')')return null;
  const body=tokens.slice(5,-2);let at=0;
  while(at<body.length){
    if(!['html_root_url','html_logo_url','html_favicon_url','html_playground_url','issue_tracker_base_url'].includes(body[at]?.text)||body[at+1]?.text!=='='||body[at+2]?.type!=='string'||!body[at+2].text.startsWith('"'))return null;
    at+=3;if(at<body.length&&body[at++]?.text!==',')return null;
  }
  return body.length?{name,span:attribute.span,preludeControl:false}:null;
}

import {originalStructuredDocumentationInnerItem} from './registered-builtin-caller-attribute-source.mjs';

export function builtinStructuredDocumentationInnerSourceItem(item,source,view,profile){
  const actual=(view?originalModuleViewItems(view,source):sourceItems(source)).find(candidate=>candidate.start===item.start&&candidate.end===item.end);
  if(!actual)return null;
  const tokens=actual.tokens.filter(token=>token.type!=='comment');
  if(tokens[0]?.text!=='#'||tokens[1]?.text!=='!'||tokens[2]?.text!=='['||tokens.at(-1)?.text!==']')return null;
  const condition=itemConfiguration(tokens,profile);
  if(condition.status!=='active'||condition.attributes.length!==1)return null;
  const attribute=condition.attributes[0],name=tokens[3]?.text;
  if(['no_std','no_core','no_implicit_prelude'].includes(name)&&tokens.length===5)return {name,span:attribute.span,preludeControl:name};
  if(name==='doc'){const module={file:view?.sourcePath??'original-inner-literal-doc.rs',path:view?.modulePath??[],source,...(view?{sourceView:view}:{}),compilationProfile:profile},actual=originalStructuredDocumentationInnerItem(module,item);if(actual)return {name,span:attribute.span,preludeControl:false};return null;}
  return null;
}
