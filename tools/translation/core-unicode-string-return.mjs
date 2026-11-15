// An explicit source adoption, not a theorem about original Iterator dispatch.
// Only the complete borrowed-Str whitespace tail fixes the intended Text API.
export function selectUnicodeStringReturn(source,item,rows,parameters,body){
 const fn=rows.findIndex(row=>row.text==='fn'),open=fn+2;
 const parameter=rows.slice(open+1,parameters),returned=rows.slice(parameters+1,body);
 const identifier=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
 if(!identifier(parameter[0])||parameter[1]?.text!==':'||parameter.slice(2).map(row=>row.text).join('')!=='&crate::translation_core::Str')return null;
 if(returned.length!==2||returned[0].text!=='->'||returned[1].text!=='String')return null;
 const inner=rows.slice(body+1,-1),callback=inner[9];
 if(!identifier(callback))return null;
 const expected=[parameter[0].text,'.','chars','(',')','.','filter','(','|',callback.text,'|','!',callback.text,'.','is_whitespace','(',')',')','.','collect','(',')'];
 if(inner.length!==expected.length||!expected.every((word,at)=>inner[at].text===word))return null;
 if(item.tokens.some(row=>row.type==='comment'&&row.start>=rows[open].start&&row.end<=rows.at(-1).end))return null;
 const span=[returned[1].start,returned[1].end];
 return {span,expected:source.slice(...span),replacement:'crate::translation_core::Text'};
}
