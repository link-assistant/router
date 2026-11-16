// Source provenance and CST only. A selected definition is still conditional
// until a separate source-bound macro owner and hygiene proof is available.








import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();

const fail=reason=>throwOriginalCapturedTypeError('Original declarative item output: '+reason);
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}









export function renderOriginalArchitectureOutputTrees(trees){
 guard();
 const leaves=[];let text='',cells=0;
 function append(value){text+=value;if(text.length>2097152||Buffer.byteLength(text)>8388608)fail('generated concrete source budget');}
 function sequence(nodes,depth=0){if(depth>64)fail('generated token delimiter budget');for(let at=0;at<nodes.length;at++){if(at)append(' ');const node=nodes[at];if(++cells>32000)fail('generated token cell budget');if(node.kind==='token'){const start=text.length;append(node.text);leaves.push({span:[start,text.length],tree:node,origin:'original-token'});}else if(node.kind==='group'){if(!['(','[','{'].includes(node.delimiter))fail('unknown generated delimiter');const start=text.length;append(node.delimiter);sequence(node.children,depth+1);append({'(':')','[':']','{':'}'}[node.delimiter]);leaves.push({span:[start,start+1],tree:node,origin:'original-delimiter-open'},{span:[text.length-1,text.length],tree:node,origin:'original-delimiter-close'});}else if(node.kind==='fragment'){if(!['ty','meta','ident','tt','expr','block','literal','lifetime','vis','item'].includes(node.fragment))fail('unknown privately forwarded fragment');sequence(node.trees,depth+1);}else fail('unresolved generated $crate or token kind');}}
 sequence(trees);guard();return {source:text,leaves,cells,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false};
}



