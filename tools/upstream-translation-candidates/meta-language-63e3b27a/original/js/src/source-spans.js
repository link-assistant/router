import {readRuntimeProjectData} from './project-data-loader.js';
import {acceptSourceSpanOffset,acceptSourceSpanInterval} from './source-span-rules.js';

export const SOURCE_SPAN_POLICY=readRuntimeProjectData(new URL('./translation/data/source-span.lino',import.meta.url));

/** Adapt a represented source span to the shared numerical decisions. */
export function acceptSourceSpanRecord(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Reflect.ownKeys(value).length!==SOURCE_SPAN_POLICY.offsetFields.length)return false;
  const offsets=[];
  for(const field of SOURCE_SPAN_POLICY.offsetFields) {
    const descriptor=Object.getOwnPropertyDescriptor(value,field);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return false;
    const offset=descriptor.value;
    if(typeof offset!=='number'||!acceptSourceSpanOffset(offset,Object.is(offset,-0)))return false;
    offsets.push(offset);
  }
  return acceptSourceSpanInterval(offsets[0],offsets[1]);
}

/** Inspect named source-span data without invoking accessors or iterator overrides. */
export function validateSourceSpans(root) {
  const visited=new WeakSet(),pending=[[root,0]];
  const main=root&&typeof root==='object'?Object.getOwnPropertyDescriptor(root,'main'):undefined;
  const legacyMain=main&&Object.hasOwn(main,'value')?main.value:undefined;
  let visits=0;
  while(pending.length){
    const [value,depth]=pending.pop();
    if(!value||typeof value!=='object'||visited.has(value))continue;
    if(depth>256||++visits>100_000)throw new TypeError('the linked program exceeds its source-span resource limit');
    visited.add(value);
    if(value instanceof Map){
      for(const [key,child] of Map.prototype.entries.call(value))pending.push([key,depth+1],[child,depth+1]);
      continue;
    }
    for(const field of Reflect.ownKeys(value)){
      const descriptor=Object.getOwnPropertyDescriptor(value,field);
      // Legacy main metadata can retain false as opaque data. Selected models
      // check their own complete shape first; false never becomes a span.
      const legacyMainMetadata=value===legacyMain&&descriptor.value===false;
      if(field===SOURCE_SPAN_POLICY.role&&(!Object.hasOwn(descriptor,'value')||descriptor.value!=null&&!legacyMainMetadata&&!acceptSourceSpanRecord(descriptor.value)))throw new TypeError('a linked source span is invalid');
      if(Object.hasOwn(descriptor,'value'))pending.push([descriptor.value,depth+1]);
    }
  }
}
