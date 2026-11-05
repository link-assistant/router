// Reuse the existing text substitution engine on callback source DATA.
// Temporary written types select proposals only; the original whole caller
// remains the sole input to actual name/type/ownership/executable checks.
import {sourceItems} from './rust-structure.mjs';
import {selectTextMethodAdoption} from './text-method-adoption-selection.mjs';
import {originalDeclarationHeader} from './module-bindings.mjs';
import {applyLayeredCoreOrFormatAdoptionSource as applyLayeredCoreAdoptionSource} from './layered-core-format-adoption-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
function close(tokens,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<tokens.length;at++){const token=tokens[at];if(['string','char','comment'].includes(token.type))continue;if(pairs[token.text])stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)return -1;if(!stack.length)return at;}}return -1;}
function split(tokens,separator=','){const rows=[];let start=0,angle=0;for(let at=0;at<tokens.length;at++){if(['(','[','{'].includes(tokens[at].text)){const end=close(tokens,at);if(end<0)return [];at=end;}else if(tokens[at].text==='<')angle++;else if(tokens[at].text==='>')angle--;else if(tokens[at].text==='>>')angle-=2;else if(!angle&&tokens[at].text===separator){rows.push(tokens.slice(start,at));start=at+1;}}rows.push(tokens.slice(start));return rows.filter(row=>row.length);}
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const text=tokens=>tokens.map(token=>token.text).join('');
export function proposeCallbackTextBodySource(body,scope){
 if(typeof body!=='string'||body.length>65536||!body.includes('.'))return null;const parameters=callbackSourceParameterDeclarations(scope);if(!parameters)return null;
 const prefix='pub fn __router_callback_text_source('+parameters.join(',')+'){\n',suffix='\n}\n',wrapper=prefix+body+suffix,concrete=transportConcreteSyntaxSource(wrapper,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==wrapper)throw new TypeError('Complete callback text source wrapper differs');const items=sourceItems(wrapper),item=items.length===1?items[0]:null;if(item?.term!=='fn'||item.name!=='__router_callback_text_source')throw new TypeError('Complete source-only callback wrapper required');
 const selected=selectTextMethodAdoption(wrapper,item,{jsonNames:new Set()},[],new Set(),{originalDeclarationHeader,close,split,text,ident});if(!selected.edits.length)return null;
 const rebase=edit=>{if(edit.span[0]<prefix.length||edit.span[1]>prefix.length+body.length)throw new TypeError('Callback text edit escapes its original body');return {...edit,span:edit.span.map(at=>at-prefix.length)};};const edits=selected.edits.map(rebase),scalarEdits=selected.languageEdits.map(rebase),proposal=applyLayeredCoreAdoptionSource(body,edits,{languageRule:'callback-text:retain-original-body-and-text-evaluation-order',repositoryRule:'router-core:qualify-callback-text-operations',bindings:[{native:'crate::translation_core::',neutral:'::translation_compatibility_format::'},{native:'crate::translation_text_core::',neutral:'::translation_compatibility_text::'}],scalarEdits});
 return {...proposal,wrapper:{source:wrapper,concreteSyntax:concrete.meta,bodySpan:[prefix.length,prefix.length+body.length],functionOwnerProved:false,temporaryTypesAreSourceData:true},selections:selected.selections.map(row=>({...row,span:row.span.map(at=>at-prefix.length),functionOwnerProved:false})),sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}

import {callbackSourceParameterDeclarations} from './callback-source-parameters.mjs';
