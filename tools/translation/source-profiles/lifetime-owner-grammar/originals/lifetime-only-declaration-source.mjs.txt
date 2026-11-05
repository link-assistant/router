// General source-only lifetime binders. No region solver or type authority.
const fail=message=>{throw new TypeError('Lifetime-only source binder: '+message);};
const lifetime=word=>typeof word==='string'&&/^'[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(word)&&word!=="'_";
const identifier=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
export function readLifetimeOnlySourceBinders(rows,start,outer=[]){
 if(!Array.isArray(rows)||!Number.isSafeInteger(start)||start<0||start>rows.length||!Array.isArray(outer)||outer.length>64||outer.some(word=>!lifetime(word)))fail('bounded original lifetime source required');
 const known=new Set(outer);if(rows[start]?.text!=='<')return {after:start,lifetimes:[...known],declared:[]};
 const declared=[],bounds=[];let at=start+1,work=0;
 while(true){
  if(++work>256||declared.length>=64)fail('lifetime source binder bound exceeded');const name=rows[at++]?.text;if(!lifetime(name)||name==="'static"||known.has(name))fail('only unique ordinary lifetime binders are supported');known.add(name);declared.push(name);
  if(rows[at]?.text===':'){
   at++;while(true){if(++work>256)fail('lifetime source bounds exceeded');const bound=rows[at++]?.text;if(!lifetime(bound))fail('type/const binder or malformed lifetime bound');bounds.push(bound);if(rows[at]?.text!=='+')break;at++;}
  }
  if(rows[at]?.text==='>'){at++;break;}if(rows[at++]?.text!==',')fail('only complete lifetime binder lists supported');if(rows[at]?.text==='>'){at++;break;}
 }
 if(bounds.some(word=>word!=="'static"&&!known.has(word)))fail('lifetime bound lacks an original binder');return {after:at,lifetimes:[...known],declared};
}
export function readLifetimeOnlyTypeOwnerSource(rows,lifetimes=[]){
 if(!Array.isArray(rows)||rows.length>512||!rows.length||!Array.isArray(lifetimes)||lifetimes.length>64)fail('bounded complete original impl owner required');
 const known=new Set(lifetimes),forbidden=new Set(['for','where','as','dyn','impl','trait','const','unsafe','extern','async','default','mut','fn','pub','auto','type']);let at=rows[0]?.text==='::'?1:0;
 while(at<rows.length){
  if(!identifier(rows[at])||forbidden.has(rows[at].text))fail('ordinary lifetime-only impl path required');at++;
  if(rows[at]?.text==='<'){
   at++;let count=0;while(true){if(++count>64)fail('impl lifetime argument bound exceeded');const word=rows[at++]?.text;if(!lifetime(word)||word!=="'static"&&!known.has(word))fail('impl type/const or unbound lifetime argument');if(rows[at]?.text==='>'){at++;break;}if(rows[at++]?.text!==',')fail('complete impl lifetime argument separator required');if(rows[at]?.text==='>'){at++;break;}}
  }
  if(at===rows.length)return true;if(rows[at++]?.text!=='::'||at===rows.length)fail('complete impl owner path required');
 }
 fail('missing impl owner');
}
