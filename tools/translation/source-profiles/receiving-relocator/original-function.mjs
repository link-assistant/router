function relocate(source,original,overrides={}){
 const edits=[];let text=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(whole,prefix,quote,path)=>{const url=new URL(path,original).href,target=overrides[url]??url,after=prefix+quote+target+quote;edits.push({before:whole,after});return after;});
 if(text.includes('import.meta.url')){const after=json(original.href);text=text.replace(/\bimport\.meta\.url\b/g,after);edits.push({before:'import.meta.url',after,all:true});}
 let inverse=text;for(const edit of [...edits].reverse()){if(edit.all)inverse=inverse.split(edit.after).join(edit.before);else{assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,edit.before);}}assert.equal(inverse,source);return {text,edits};
}