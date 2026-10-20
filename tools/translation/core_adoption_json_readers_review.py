#!/usr/bin/env python3
"""Read-only complete proposal review. No Rust/JS execution or installation.

This checks the emitted data against pinned inputs and source partitions. It
does not reissue private compiler proofs or establish Rust semantic authority.
Run only after Root's producer is terminal and before its source HEAD changes.
"""
from pathlib import Path, PurePosixPath
import argparse, gzip, hashlib, io, json, math, os, re, stat, subprocess, sys, tarfile

sys.dont_write_bytecode=True
import core_adoption_review as source_review
from core_adoption_review import (require, fields, pairs, parse, encoded, sha, digest, relative, regular, identity, read_stable, check_identity, u16, span, part, trace, check_cst, proposal, GzipTransport, reader_mapping)

def reader_stage_metadata(metadata, before):
    """Exact producer return shapes; absent effects require full-source absence.

    The actual producer does not create a derive context when there is no
    invocation. This is only a conservative data/source check: even an inert
    comment or string containing the spelling refuses this absent-field lane.
    No graph item census, copied role or empty certificate proves absence.
    """
    fields(metadata, ['keys', 'values'], 'stage metadata')
    values = metadata['values']
    require(isinstance(values, dict), 'complete stage own values')
    has_effect = 'producerEffects' in values
    keys = ['schema','entry','compilationProfile','dependencyInputs','inputs','before','after','proposals','skipped']
    if has_effect: keys.append('producerEffects')
    keys += ['moduleGraph','migrationSemantics','executableAdmission']
    require(metadata['keys'] == keys and list(values) == [key for key in keys if key not in ['before','after','inputs','moduleGraph','proposals']], 'unknown stage return/key order')
    if has_effect:
        require(isinstance(values['producerEffects'], dict), 'present producerEffects requires complete evidence')
    else:
        require(isinstance(before, dict) and before and all(isinstance(file, str) and isinstance(source, str) for file, source in before.items()), 'complete before sources for absent producerEffects')
        require(all('derive' not in source for source in before.values()), 'absent producerEffects requires independent complete-source derive absence')
    return values

def retained_problem_source(problem, ancestor_items):
    """Validate retained diagnostic data against original items, never issue a proof."""
    fields(problem,['span','reason'],'exact primitive producer problem record')
    coordinates=problem['span'];reason=problem['reason']
    require(isinstance(coordinates,list) and len(coordinates)==2 and
            all(type(value) is int for value in coordinates) and
            0<=coordinates[0]<coordinates[1] and isinstance(reason,str) and reason,
            'primitive producer problem integer span/nonempty reason')
    candidates=[]
    for module,item in ancestor_items.get(tuple(coordinates),[]):
        require(coordinates[1]<=module['sourceUnits'],
                'retained ancestor declaration source bounds')
        candidates.append(item)
    require(candidates,'primitive producer problem rejoins an actual complete ancestor declaration')
    def leading_attributes(item):
        tokens=[token for token in item['tokens'] if token['type']!='comment'];at=0;names=[]
        pairs={'(':')','[':']','{':'}'}
        def close(rows,start):
            pending=[]
            for cursor in range(start,len(rows)):
                token=rows[cursor];word=token['text']
                if token['type'] in ['string','char']:continue
                if word in pairs:pending.append(pairs[word])
                elif word in [')',']','}']:
                    require(pending and pending.pop()==word,'balanced complete retained attribute tokens')
                    if not pending:return cursor
            require(False,'complete retained leading attribute')
        def attribute_names(body):
            if not body:return []
            result=[body[0]['text']]
            # This is a balanced lexical witness only. Neither a cfg predicate
            # nor an active macro expansion is selected or independently proved.
            pending=[body]
            while pending:
                current=pending.pop()
                if not current or current[0]['text']!='cfg_attr' or len(current)<4 or current[1]['text']!='(':continue
                stop=close(current,1)
                if stop!=len(current)-1:continue
                groups=[];begin=cursor=2
                while cursor<stop:
                    word=current[cursor]['text']
                    if current[cursor]['type'] not in ['string','char'] and word in pairs:cursor=close(current,cursor)
                    elif word==',':groups.append(current[begin:cursor]);begin=cursor+1
                    cursor+=1
                groups.append(current[begin:stop])
                if len(groups)<2 or not groups[0]:continue
                for child in groups[1:]:
                    if not child:continue
                    result.append(child[0]['text']);pending.append(child)
            return result
        while at<len(tokens) and tokens[at]['text']=='#':
            at+=1
            if at<len(tokens) and tokens[at]['text']=='!':at+=1
            require(at<len(tokens) and tokens[at]['text']=='[','retained leading attribute opener')
            stop=close(tokens,at);body=tokens[at+1:stop]
            require(body and isinstance(body[0]['text'],str) and body[0]['text'],
                    'retained leading attribute name')
            names.extend(attribute_names(body));at=stop+1
        return names
    fixed={
        'unresolved extern crate declaration','unresolved extern crate alias',
        'extern crate type binding competes with str','unresolved declaration producer',
        'source type declaration competes with str','unresolved glob type imports',
        'source import competes with str','unresolved declaration-position bang producer'}
    prefixes=['unresolved declaration header: ','unresolved declaration producer: ',
              'unresolved use declaration: ']
    attribute='unresolved attribute producer '
    require(reason in fixed or any(reason.startswith(prefix) and len(reason)>len(prefix)
            for prefix in prefixes) or reason.startswith(attribute) and len(reason)>len(attribute),
            'unknown primitive producer diagnostic reason family')
    witnesses=[]
    for item in candidates:
        tokens=[token for token in item['tokens'] if token['type']!='comment']
        words=[token['text'] for token in tokens]
        if reason.startswith(attribute):
            valid=reason[len(attribute):] in leading_attributes(item)
        elif reason in ['unresolved extern crate declaration','unresolved extern crate alias',
                        'extern crate type binding competes with str']:
            valid=any(words[at:at+2]==['extern','crate']for at in range(len(words)-1))
            if reason=='extern crate type binding competes with str':valid=valid and 'str'in words
        elif reason=='source type declaration competes with str':
            valid=item.get('term')in ['type','struct','enum','union','trait','mod'] and item.get('name')=='str'
        elif reason=='unresolved glob type imports':valid=item.get('term')=='use' and '*'in words
        elif reason=='source import competes with str':valid=item.get('term')=='use' and 'str'in words
        elif reason.startswith('unresolved use declaration: '):valid=item.get('term')=='use'
        elif reason=='unresolved declaration-position bang producer':
            valid=item.get('term')=='opaque' and any(word=='!'or word.endswith('!')for word in words)
        else:
            # Header/producer exception text is retained, not recreated by a
            # second parser. Its complete original declaration is the witness.
            valid=bool(tokens)
        witnesses.append(valid)
    require(any(witnesses),'retained diagnostic reason rejoins its actual ancestor source tokens')

def check_reader_selections(row, source, modules, external, dependency_profile):
    """Only source equations/provenance. No private method/type/borrow authority."""
    require(len(row['selections'])==len(row['edits']),'one complete reader equation per edit')
    scope_problems={};scope_items={};original_owners={};source_length=len(u16(source))//2
    for(file,path),module in modules.items():
        if file!=row['file']:continue
        for item in module['originalItems']:
            if item.get('term')=='fn':original_owners.setdefault((item.get('name'),item['start'],item['end']),[]).append((path,item))
    for preserved in row['preserved']:
        fields(preserved,['function','span','reason']+(['problems']if 'problems'in preserved else []),'complete retained ordinary function uncertainty')
        require(isinstance(preserved['function'],str) and isinstance(preserved['span'],list),'preserved function name/list span')
        owner_span=span(preserved['span'],source_length)
        owners=original_owners.get((preserved['function'],*owner_span),[])
        require(len(owners)==1 and isinstance(preserved['reason'],str)and preserved['reason'],'preserved refusal rejoins complete actual original function')
        owner_path,item=owners[0]
        for edit in row['edits']:
            a,b=span(edit['span'],source_length)
            require(not(a<owner_span[1] and b>owner_span[0] or a==b and owner_span[0]<=a<owner_span[1]),
                    'no edit changes a complete preserved function')
        if 'problems'in preserved:
            problems=preserved['problems'];require(isinstance(problems,list) and preserved['reason']=='configuration, source producer or namespace uncertainty','complete retained scope problems')
            if owner_path in scope_problems:require(problems==scope_problems[owner_path],'same original scope retains its complete ordered problem array')
            else:scope_problems[owner_path]=problems
            if owner_path not in scope_items:
                # Invocation-local source indexes only: no validated diagnostic,
                # namespace, owner, type or executable result is cached.
                ancestor_items={}
                for(file,path),module in modules.items():
                    if len(path)>len(owner_path) or owner_path[:len(path)]!=path:continue
                    for declaration in module['originalItems']:
                        ancestor_items.setdefault((declaration['start'],declaration['end']),[]).append((module,declaration))
                scope_items[owner_path]=ancestor_items
            seen_string=False
            for value in problems:
                if isinstance(value,str):seen_string=True
                else:
                    require(not seen_string,'primitive producer problem records precede reader scope strings')
                    retained_problem_source(value,scope_items[owner_path])
    units=u16(source);prefix='crate::translation_core::';members={'as_str','as_bool','as_u64','as_i64','as_null'}
    def words(tokens):return ''.join(t['text']for t in tokens)
    def ident(t):return isinstance(t,dict)and t.get('type')=='ident'and t.get('text','').isidentifier()
    def close(tokens,start):
        pairs={'(':')','[':']','{':'}'};pending=[]
        require(0<=start<len(tokens)and tokens[start]['text']in pairs,'reader balanced group')
        for at in range(start,len(tokens)):
            t=tokens[at];word=t['text']
            if t['type']in ['string','char','comment']:continue
            if word in pairs:pending.append(pairs[word])
            elif word in [')',']','}']:
                require(pending and pending.pop()==word,'reader delimiter mismatch')
                if not pending:return at
        require(False,'reader source group unclosed')
    identifier=ident
    def use_leaves(item):
        tokens = [token for token in item['tokens'] if token['type'] != 'comment']
        starts = [at for at,token in enumerate(tokens) if token['text'] == 'use']
        require(len(starts) == 1, 'actual complete import declaration')
        at, leaves = starts[0]+1, []
        def eat(word):
            nonlocal at
            if at < len(tokens) and tokens[at]['text'] == word:
                at += 1
                return True
            return False
        def name():
            nonlocal at
            require(at < len(tokens) and identifier(tokens[at]), 'actual import path identifier')
            result = tokens[at]['text']; at += 1
            return result
        def tree(path, absolute=False):
            if eat('::'):
                require(not path, 'absolute import prefix')
                absolute = True
            if eat('{'):
                if at < len(tokens) and tokens[at]['text'] == '}':
                    leaves.append({'segments':path,'externalOnly':absolute,'validateOnly':True,'namespaceAuthority':False})
                while at < len(tokens) and tokens[at]['text'] != '}':
                    tree(path,absolute)
                    if not eat(','): break
                require(eat('}'), 'actual complete import group')
                return
            if eat('*'):
                require(path, 'actual import glob prefix')
                leaves.append({'segments':path,'externalOnly':absolute,'glob':True,'namespaceAuthority':False})
                return
            segment = name(); current = path+[segment]
            if eat('::'):
                tree(current,absolute)
                return
            alias = name() if eat('as') else None
            own = segment == 'self' and bool(path)
            leaves.append({'segments':path if own else current,'externalOnly':absolute,'self':own,'alias':alias,'name':alias if alias is not None else path[-1] if own else segment,'namespaceAuthority':False})
        tree([])
        require(eat(';') and at == len(tokens), 'complete actual import terminator')
        return leaves
    def split(tokens):
        result=[];start=angle=at=0
        while at<len(tokens):
            word=tokens[at]['text']
            if word in ['(','[','{']:at=close(tokens,at)
            elif word=='<':angle+=1
            elif word=='>':angle-=1
            elif word=='>>':angle-=2
            elif not angle and word==',':
                if tokens[start:at]:result.append(tokens[start:at])
                start=at+1
            at+=1
        if tokens[start:]:result.append(tokens[start:])
        return result
    def import_join(value,module_path):
        fields(value,['kind','file','module','sourceSha256','span','source','leaf','binding','executableAdmission'],'direct canonical import candidate')
        require(value['kind']=='original-direct-canonical-json-import-candidate' and value['file']==row['file'] and value['module']==list(module_path) and value['sourceSha256']==sha(source.encode()) and value['executableAdmission'] is False,'same current consumer full source/module import')
        module=modules[(row['file'],module_path)];selected=span(value['span'],len(units)//2)
        require(value['source']==part(source,selected,units),'full canonical import text')
        actual=[item for item in module['items']if item.get('term')=='use'and [item['start'],item['end']]==selected]
        require(len(actual)==1,'one actual declaring import')
        # The complete current private binding is retained data. Rejoin every
        # source field used by the selector; this does not reissue that binding.
        leaf=value['leaf'];require(isinstance(leaf,dict)and leaf.get('segments')==['serde_json','Value'] and leaf.get('glob') is not True and leaf.get('self') is False and leaf.get('validateOnly') is not True and leaf.get('namespaceAuthority') is False and leaf.get('name') not in [None,'_'],'canonical named import leaf')
        require(ident({'type':'ident','text':leaf['name']}) and leaf.get('alias')in [None,leaf['name']],'ordinary canonical alias')
        binding=value['binding'];require(isinstance(binding,dict)and binding.get('namespace')=='type'and binding.get('name')==leaf['name']and binding.get('status')=='resolved'and binding.get('kind')=='enum'and binding.get('target')==['serde_json','Value']and binding.get('via')=='named-import'and binding.get('source')==row['file']and binding.get('span')=={'start':selected[0],'end':selected[1]},'retained actual named enum binding/source/span')
        fields(leaf,['segments','externalOnly','self','alias','name','namespaceAuthority'],'complete named-import leaf')
        fields(binding,['name','namespace','target','kind','status','visibility','source','span','via','evidence'],'complete actual canonical binding row')
        actual_leaves=use_leaves(actual[0]);matches=[at for at,entry in enumerate(actual_leaves)if entry==leaf]
        require(len(matches)==1 and binding['evidence']==[{'source':row['file'],'span':{'start':selected[0],'end':selected[1]},'via':'named-import'}],'exact current named import origin/evidence')
        visibility=binding['visibility'];require(visibility=={'kind':'public'}or isinstance(visibility,dict)and set(visibility)=={'kind','path'}and visibility['kind']=='restricted'and isinstance(visibility['path'],list)and list(module_path)[:len(visibility['path'])]==visibility['path'],'source visibility to actual ancestor')
        tokens=actual[0]['tokens'];require(not any(t.get('rawIdentifier')or t['text'].startswith('r#')or t['text']=='r'and at+2<len(tokens)and tokens[at+1]['text']=='#'and t['end']==tokens[at+1]['start']and tokens[at+1]['end']==tokens[at+2]['start']for at,t in enumerate(tokens)),'raw import candidate refused')
        require('serde_json'in [t['text']for t in tokens]and 'Value'in [t['text']for t in tokens],'canonical source import path')
        return leaf['name']
    edits={tuple(span(e['span'],len(units)//2)):e for e in row['edits']}
    require(len(edits)==len(row['edits']),'unique reader edit spans')
    language_edits=[];fresh=set();subjects={}
    for selected in row['selections']:
        fields(selected,['function','functionSpan','span','receiver','member','owner','locals','nativeEquation','executableAdmission','loanBoundary'],'complete canonical reader selection')
        require(selected['nativeEquation']=='canonical Option<&Json>::and_then with one inert canonical JSON reader function item'and selected['executableAdmission'] is False and selected['loanBoundary']=='same shared input root; no owned temporary introduced','explicit source-only equation/loan boundary')
        function_span=span(selected['functionSpan'],len(units)//2);owners=[(path,item)for(file,path),module in modules.items()if file==row['file']for item in module['items']if item.get('term')=='fn'and [item['start'],item['end']]==function_span]
        require(len(owners)==1,'one full actual original function owner')
        module_path,item=owners[0];require(item.get('name')==selected['function'],'actual original function name')
        module=modules[(row['file'],module_path)];view=module['view'];require(view and view.get('configurationCondition')=='active','active original consumer view')
        tokens=[t for t in item['tokens']if t['type']!='comment'];fn=[i for i,t in enumerate(tokens)if t['text']=='fn'and i+2<len(tokens)and tokens[i+1]['text']==selected['function']and tokens[i+2]['text']=='(']
        require(len(fn)==1,'complete ordinary nongeneric function header');at=fn[0]+2;end=close(tokens,at);parameters={};keys=set()
        canonical_names={};all_leaves=[]
        for declaring in module['items']:
            if declaring.get('term')!='use':continue
            for leaf in use_leaves(declaring):all_leaves.append((declaring,leaf))
        for declaring,leaf in all_leaves:
            name=leaf.get('name')
            if leaf.get('segments')==['serde_json','Value']and not leaf.get('glob')and not leaf.get('self')and not leaf.get('validateOnly')and name not in [None,'_']:
                active=[t for t in declaring['tokens']if t['type']!='comment'];opening=0
                while opening<len(active)and active[opening]['text']=='#':
                    require(opening+1<len(active)and active[opening+1]['text']=='[','complete canonical import attribute');stop=close(active,opening+1)
                    require(active[opening+2]['text']in ['doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller'],'no conditional/unknown canonical import')
                    opening=stop+1
                require(sum(other.get('name')==name for _,other in all_leaves)==1 and not any(other.get('term')!='use'and other.get('name')==name for other in module['items']),'unique original canonical parameter alias without local type competition')
                canonical_names[name]=True
        owner=selected['owner'];fields(owner,['member','qualified','import'],'reader function-item owner')
        if owner['import'] is not None:canonical_names[import_join(owner['import'],module_path)]=True
        for group in split(tokens[at+1:end]):
            require(len(group)>=3 and ident(group[0])and group[1]['text']==':'and group[0]['text']not in parameters,'distinct immutable original formal')
            name=group[0]['text'];kind=words(group[2:]);role=None
            def canonical(value):return value in [prefix+'Json','serde_json::Value']or value in canonical_names
            if kind.startswith('&')and canonical(kind[1:]):role='json'
            elif kind.startswith(prefix+'Maybe<&')and kind.endswith('>')and canonical(kind[len(prefix+'Maybe<&'):-1]):role='optional-json'
            if kind=='&'+prefix+'Str':keys.add(name)
            parameters[name]={'role':role,'type':kind,'span':[group[0]['start'],group[-1]['end']],'sourceName':name}
        receiver=selected['receiver'];fields(receiver,['span','source','formal'],'actual reader receiver')
        require(isinstance(receiver['formal'],dict)and receiver['formal'].get('sourceName')in parameters and receiver['formal']==parameters[receiver['formal']['sourceName']],'complete actual formal/type/role source')
        formal=receiver['formal'];require(formal['role']in ['json','optional-json'],'shared source formal root')
        begin=span(selected['span'],len(units)//2);match=[i for i,t in enumerate(tokens)if t['start']==begin[0]and t['text']==formal['sourceName']]
        require(len(match)==1,'exact selected formal token');cursor=match[0]+1;role=formal['role'];completed=False
        while cursor<len(tokens)and tokens[cursor]['text']=='.'and cursor+2<len(tokens)and ident(tokens[cursor+1])and tokens[cursor+2]['text']=='(':
            stop=close(tokens,cursor+2);method=tokens[cursor+1]['text'];args=tokens[cursor+3:stop]
            if method=='get'and role=='json'and len(args)==1 and(args[0]['type']=='string'or ident(args[0])and args[0]['text']in keys):role='optional-json';cursor=stop+1;continue
            if method=='unwrap_or'and role=='optional-json'and len(args)==1 and parameters.get(args[0]['text'],{}).get('role')=='json':role='json';cursor=stop+1;continue
            require(method=='and_then'and role=='optional-json'and stop+1<=len(tokens),'closed selected Option reader boundary')
            require(begin[1]==tokens[stop]['end']and owner['qualified']==words(args[:-2])and words(args[-2:-1])=='::'and args[-1]['text']==selected['member']==owner['member']and selected['member']in members,'complete selected canonical function item/end')
            require(owner['qualified']in [prefix+'Json','serde_json::Value']or owner['qualified']in canonical_names,'exact canonical qualified/imported owner candidate')
            expected_span=[tokens[match[0]]['start'],tokens[cursor]['start']];require(receiver['span']==expected_span and receiver['source']==part(source,expected_span,units),'full unchanged receiver source')
            require(not any(t['type']=='comment'and t['start']>=tokens[cursor]['start']and t['end']<=begin[1]for t in item['tokens']),'no comment deleted in selected suffix')
            completed=True;break
        require(completed,'selected full source chain found')
        names=selected['locals'];require(isinstance(names,list)and len(names)==2 and len(set(names))==2 and all(isinstance(name,str)and re.fullmatch('__router_json_reader_[0-9]+',name)for name in names),'two bounded deterministic hygienic locals')
        for name in names:
            require(name not in fresh and not re.search(r'(?<!\w)'+re.escape(name)+r'(?!\w)',source),'whole original source and prior generated local hygiene');fresh.add(name)
        a,b=names;member=selected['member'];old=part(source,begin,units)
        equation='{ let '+a+' = '+receiver['source']+'; if let ::core::option::Option::Some('+b+') = '+a+' { ::serde_json::Value::'+member+'('+b+') } else { ::core::option::Option::None } }'
        repository='{ let '+a+' = '+receiver['source']+'; if let '+prefix+'Maybe::Some('+b+') = '+a+' { '+prefix+'Json::'+member+'('+b+') } else { '+prefix+'Maybe::None } }'
        require(tuple(begin)in edits and edits[tuple(begin)]=={'span':begin,'expected':old,'replacement':repository},'exact combined reader substitution/no receiver re-evaluation')
        language_edits.append({'span':begin,'expected':old,'replacement':equation})
        subjects[tuple(function_span)]={'file':row['file'],'module':list(module_path),'function':selected['function'],'beforeSpan':function_span,'beforeFunctionSha256':sha(part(source,function_span,units).encode()),'executableAdmission':False}
    require(len(subjects)<=len(row['selections']),'complete selected-function count')
    return sorted(language_edits,key=lambda edit:edit['span'][0]),list(subjects.values())


def reader_proposal(row, source, expected_trace, language_edits):
    """Complete two real CST stages, generated-region-only binding, full inverse."""
    require(row['executableAdmission'] is False and row['completeInverse'] is True, 'reader proposal remains source-only/full inverse')
    require(isinstance(row['stages'],list) and len(row['stages'])==2, 'exactly two independent complete reader CST stages')
    first,second=row['stages']
    shape=['name','before','after','edits','mapping','trace','completeInverse']
    fields(first,shape,'complete language CST stage');fields(second,shape,'complete repository CST stage')
    require(first['name']=='canonical-option-equation' and second['name']=='owned-generated-path-binding' and first['completeInverse'] is True and second['completeInverse'] is True,'fixed independent stage names/inverses')
    require(first['before']==row['before'] and first['after']==row['intermediate']==second['before'] and second['after']==row['after'],'complete input/intermediate/output document identity')
    require(first['edits']==language_edits,'all language equations rejoined to complete original source')
    a,m,count,doc=reader_mapping(first,source)
    require(count==len(row['selections']),'language selection count')
    repository_edits=[]
    substitutions=[part_ for part_ in first['mapping']if part_['kind']=='substitution']
    for selected,mapped in zip(sorted(row['selections'],key=lambda selected:selected['span'][0]),substitutions):
        input_,payload_=selected['locals'];receiver=selected['receiver']['source'];member=selected['member']
        some='::core::option::Option::Some';none='::core::option::Option::None';callee='::serde_json::Value::'+member
        called=callee+'('+payload_+')'
        local=len(u16('{ let '+input_+' = '+receiver+'; if let '))//2
        callee_start=local+len(some)+len('('+payload_+') = '+input_+' { ')
        none_start=callee_start+len(called+' } else { ')
        for start,old,new in [(local,some,'crate::translation_core::Maybe::Some'),(callee_start,callee,'crate::translation_core::Json::'+member),(none_start,none,'crate::translation_core::Maybe::None')]:
            interval=[mapped['after'][0]+start,mapped['after'][0]+start+len(old)]
            require(part(m,interval)==old,'generated path is actual constructed region, never receiver text search')
            repository_edits.append({'span':interval,'expected':old,'replacement':new})
    require(second['edits']==repository_edits,'only three exact generated paths per equation')
    middle,b,_,_=reader_mapping(second,m)
    before,after,combined_count,top_doc=reader_mapping(row,source)
    require(a==before==source and middle==m and after==b and doc==top_doc,'both source stages/full combined mapping agree')
    expected_first=[{'phase':'language','rules':[{'id':expected_trace[0],'edits':[edit['span']for edit in first['edits']],'beforeCodeUnits':len(u16(a))//2,'afterCodeUnits':len(u16(m))//2}]},{'phase':'repository','rules':[]}]
    expected_second=[{'phase':'language','rules':[]},{'phase':'repository','rules':[{'id':expected_trace[1],'edits':[edit['span']for edit in second['edits']],'beforeCodeUnits':len(u16(m))//2,'afterCodeUnits':len(u16(b))//2}]}]
    require(first['trace']==expected_first and second['trace']==expected_second,'complete nested CST rule traces including identity stages')
    trace(row['trace'],expected_trace)
    return before,after,combined_count,top_doc


def captured_full_snapshots(root, run, pins, head):
    """Full retained compiler/Rust/Cargo/132TS bytes, success-only old/new join."""
    retained={}
    for phase in ['before','after']:
        raw=read_stable(regular(run,'full-input-snapshots-'+phase+'.json'),16*1024*1024)
        document=parse(raw);fields(document,['sourceHead','files'],'complete input snapshot companion')
        require(document['sourceHead']==head and isinstance(document['files'],list),'actual full snapshot head')
        names=set()
        for row in document['files']:
            fields(row,['path','bytes','sha256','snapshot','physicalPresent'],'complete retained input row')
            name=relative(row['path']);require(name in pins and name not in names and {k:row[k]for k in ['path','bytes','sha256']}==pins[name] and type(row['physicalPresent'])is bool,'full input/pin census equality');names.add(name)
            require(row['physicalPresent']==((root/name).exists()or(root/name).is_symlink()),'current physical input presence matches full snapshot')
            require(row['physicalPresent']or name.startswith('docs/case-studies/issue-759/'),'unexpected missing physical guarded input')
            require(row['snapshot']=='input-blobs/'+row['sha256']+'.bin','source blob exact content-addressed path')
            data=read_stable(regular(run,row['snapshot']),128*1024*1024)
            require(len(data)==row['bytes']and sha(data)==row['sha256'],'complete retained source/TS blob bytes')
        require(names==set(pins),'every full input retained')
        retained[phase]=(raw,document)
        rust_raw=read_stable(regular(run,'all-rust-cargo-'+phase+'.json'),16*1024*1024)
        rust=parse(rust_raw);fields(rust,['sourceHead','files'],'all current Rust/Cargo snapshot companion')
        require(rust=={'sourceHead':head,'files':[row for row in document['files']if row['path'].endswith('.rs')or row['path']in ['Cargo.toml','Cargo.lock']]},'complete all-Rust guard universe, including owned witness')
        retained['rust-'+phase]=(rust_raw,rust)
    require(retained['before'][0]==retained['after'][0] and retained['rust-before'][0]==retained['rust-after'][0],'complete before/after retained source identity and bytes')
    after_raw=read_stable(regular(run,'proposal.inputs-after.json'),16*1024*1024)
    require(parse(after_raw)=={'sourceHead':head,'inputs':list(pins.values())},'producer terminal all-input rejoin vector')
    receipt=parse(read_stable(regular(run,'receipt.json'),1024*1024))
    require(isinstance(receipt,list)and len(receipt)==1,'one full actual producer receipt')
    actual=receipt[0]
    require(actual.get('exitCode')==0 and actual.get('resourceReason')is None and actual.get('inputsUnchanged')is True and actual.get('headUnchanged')is True and actual.get('cleanAfter')is True and actual.get('sourceHead')==head and actual.get('sourceGuardsAfterFailureStatus')=='complete-fresh-byte-rejoin','actual producer success/resource/source guards')
    return {name:sha(raw)for name,(raw,value)in retained.items()}



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--expected-head', required=True, help='Exact full SHA captured before this actual producer')
    args = parser.parse_args()
    root, run, payload = args.root.resolve(), args.run.resolve(), args.payload.resolve()
    report = args.report.resolve()
    require(all(report != path and path not in report.parents and report not in path.parents for path in [root, payload]), 'report must be disjoint from source/proposal')
    require(not report.exists(), 'report destination already exists')
    require(root.is_dir() and payload.is_dir() and not args.payload.is_symlink(), 'root/proposal path')
    require(root not in payload.parents and payload not in root.parents and root != payload, 'proposal/source disjointness')
    git = lambda *values: subprocess.check_output(['git', '-C', str(root), *values])
    captured_raw=read_stable(run / 'inputs.json',16*1024*1024)
    before_vector = parse(captured_raw)
    fields(before_vector, ['sourceHead', 'inputs'], 'actual receiving input vector')
    head = git('rev-parse', 'HEAD').decode().strip()
    require(isinstance(args.expected_head,str) and len(args.expected_head)==40 and all(c in '0123456789abcdef' for c in args.expected_head),'full expected HEAD syntax')
    require(head == before_vector['sourceHead'] == args.expected_head, 'actual explicit/captured/physical HEAD')
    require(not git('status', '--porcelain'), 'source worktree dirty')
    require(not (payload / 'failure.json').exists() and not (payload / 'index.pending.json').exists(), 'incomplete producer')
    pins, physical_inputs = {}, set()
    for row in before_vector['inputs']:
        fields(row, ['path', 'bytes', 'sha256'], 'captured input')
        relative(row['path']);digest(row['sha256']);require(type(row['bytes']) is int and 0<=row['bytes']<=128*1024*1024,'captured input byte bound')
        require(row['path'] not in pins, 'duplicate input pin')
        pins[row['path']] = row
    critical_source_paths=['tools/translation/migrate-core-json-readers.mjs', 'tools/translation/core-json-reader-normalization.mjs', 'tools/translation/propose-core-adoption-corpus.mjs', 'tools/translation/core-adoption-packet-storage.mjs', 'tools/translation/core-adoption-producer-context.mjs', 'tools/translation/literal-text-import-roles.mjs', 'tools/translation/migrate-core-primitives.mjs', 'tools/translation/router-core-source-data.mjs', 'tools/translation/prepare-real-source-fixtures.mjs', 'tools/translation/module-bindings.mjs', 'tools/translation/cfg-profile.mjs', 'tools/translation/rule-pipeline.mjs', 'tools/translation/concrete-syntax-meta.mjs', 'tools/translation/source-module-views.mjs', 'tools/translation/project.mjs', 'tools/translation/standard-host-bindings.mjs', 'tools/translation/extensions/standard-source-frame.mjs', 'scripts/propose-core-adoption.py', 'scripts/review-core-adoption.py', 'tools/translation/core_adoption_review.py', 'tools/translation/core_adoption_json_readers_review.py']
    require(Path(__file__).resolve()==root/'tools/translation/core_adoption_json_readers_review.py' and Path(source_review.__file__).resolve()==root/'tools/translation/core_adoption_review.py','executing fixed reviewer closure belongs to the captured source checkout')
    for name in critical_source_paths:
        require(name in pins,'complete captured selector/controller/reviewer source input '+name)
    prefix = 'js/node_modules/typescript/'
    expected_git = {p for p in git('ls-files', '-z', '--', '*.rs', 'Cargo.toml', 'Cargo.lock', 'tools/translation', 'scripts').decode().split('\0') if p and (p.endswith('.rs') or not p.startswith(('tools/translation/meta/', 'tools/translation/projects/', 'tools/translation/js-to-rust/generated/')))}
    require({p for p in pins if not p.startswith(prefix)} == expected_git, 'complete tracked compiler/Rust/Cargo census')
    compiler = (root / prefix.rstrip('/')).resolve()
    ts_files = sorted(p for p in compiler.rglob('*') if p.is_file())
    require(len(ts_files) == 132 and all(not p.is_symlink() for p in compiler.rglob('*')), 'complete installed132 TypeScript physical census')
    require({prefix + p.relative_to(compiler).as_posix() for p in ts_files} == {p for p in pins if p.startswith(prefix)}, 'captured TypeScript paths')
    require(parse(read_stable(compiler / 'package.json', 1024 * 1024))['version'] == '5.9.3', 'actual installed TypeScript version')
    # A persistent batch stream avoids retaining every complete Git blob at once.
    process = subprocess.Popen(['git', '-C', str(root), 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        for name in sorted(expected_git):
            process.stdin.write((head + ':' + name + '\n').encode()); process.stdin.flush()
            header = process.stdout.readline().split()
            require(len(header) == 3 and header[1] == b'blob', 'complete Git blob ' + name)
            size = int(header[2]); require(size <= 128 * 1024 * 1024, 'Git blob review bound')
            raw = process.stdout.read(size)
            require(len(raw) == size and process.stdout.read(1) == b'\n', 'Git stream complete')
            require(len(raw) == pins[name]['bytes'] and sha(raw) == pins[name]['sha256'], 'captured Git bytes ' + name)
            physical = root / name
            if physical.exists() or physical.is_symlink():
                physical_inputs.add(name)
                require(read_stable(regular(root, name), 128 * 1024 * 1024) == raw, 'full physical/Git bytes ' + name)
        process.stdin.close(); require(process.wait() == 0, 'Git stream exit')
    finally:
        if process.poll() is None:
            process.kill(); process.wait()
    for name in sorted(p for p in pins if p.startswith(prefix)):
        raw = read_stable(regular(compiler, name[len(prefix):]), 128 * 1024 * 1024)
        require(len(raw) == pins[name]['bytes'] and sha(raw) == pins[name]['sha256'], 'installed TypeScript fullbytes')
    physical_inputs.update(p for p in pins if p.startswith(prefix))
    index_raw = read_stable(regular(payload, 'index.json'), 64 * 1024 * 1024)
    index = parse(index_raw.decode('utf8','strict'))
    fields(index, ['schema', 'complete', 'sequence', 'entry', 'sourceRoot', 'compilationProfile', 'limits', 'inputs', 'dependencyInputs', 'census', 'stages', 'changes', 'packets', 'packetBytes', 'semanticAdmission', 'installation', 'sourceChain', 'hostBoundary', 'memory'], 'current complete json-readers index')
    require(index['schema'] == 'router-core-adoption-sequence-packets-v1' and index['complete'] is True and
            index['sequence'] == 'json-readers' and index['entry'] == 'src/lib.rs' and
            Path(index['sourceRoot']) == root and index['semanticAdmission'] is False, 'index fixed contract')
    require(index['compilationProfile'] == {'schemaVersion': 1, 'flags': {'test': False}, 'values': {}, 'closedKeys': []} and index['compilationProfile']['flags']['test'] is False, 'exact production compilation profile')
    require(index['installation']=='proposal only; review every complete stage and inverse before application; this CLI never applies sources' and index['sourceChain']=='each stage before equals previous complete after; reverse stage order and full per-file mappings to recover original sources' and index['hostBoundary']=='stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim' and index['memory']=='one full graph/context and one complete per-file CST at a time; detached packet serialization; actual live heap/RSS requires receiving evidence','unknown actual producer boundary strings')
    limits = {'files': 1024, 'paths': 20000, 'pathUnits': 4096, 'fileBytes': 8000000, 'fileUnits': 2000000,
              'sourceUnits': 32 * 1024 * 1024, 'packetBytes': 64 * 1024 * 1024, 'outputBytes': 1024 * 1024 * 1024, 'packets': 20000}
    require(index['limits'] == limits and len(index['packets']) <= limits['packets'], 'original producer limits')
    storage=GzipTransport(payload,index,index_raw)
    snapshot_digests=captured_full_snapshots(root,run,pins,head)
    records, packet_states = {}, {}
    total = 0
    for row in index['packets']:
        fields(row, ['path', 'kind', 'bytes', 'sha256'], 'packet row')
        digest(row['sha256']);require(type(row['bytes']) is int and 0<=row['bytes']<=limits['packetBytes'],'packet exact byte bound')
        name = relative(row['path']); require(name not in records and row['kind'] in ['json', 'rust-source'], 'duplicate/unknown packet')
        path = storage.path(row); raw = storage.read(row)
        require(len(raw) == row['bytes'] and sha(raw) == row['sha256'], 'every full packet bytes ' + name)
        if row['kind'] == 'json':
            require(raw.endswith(b'\n'), 'packet JSON final newline'); parse(raw)
        records[name], packet_states[name] = row, identity(path)
        total += len(raw)
    storage.finish()
    require(total == index['packetBytes'], 'complete full decoded logical packet byte census')
    used = set()
    def read(row):
        require(isinstance(row, dict) and row.get('path') in records and row == records[row['path']] and row['kind'] == 'json', 'exact packet reference')
        path = storage.path(row); raw = storage.read(row)
        require(identity(path) == packet_states[row['path']] and len(raw) == row['bytes'] and sha(raw) == row['sha256'], 'packet changed on full read')
        used.add(row['path']); return parse(raw)
    def source_rows(rows):
        values = {}
        for ref in rows:
            row = read(ref); fields(row, ['path', 'source'], 'complete source-map row')
            name = relative(row['path']); require(name not in values and isinstance(row['source'], str), 'source-map duplicate')
            values[name] = row['source']
        return values
    original = {}
    for ref in index['inputs']:
        row = read(ref); fields(row, ['path', 'source', 'identity'], 'snapshot input')
        name = relative(row['path']); require(name.endswith('.rs') and name not in original, 'input path')
        raw = read_stable(regular(root, name), limits['fileBytes'])
        require(raw == row['source'].encode('utf8') and len(u16(row['source'])) // 2 <= limits['fileUnits'], 'full original source bytes')
        require(name in pins and sha(raw) == pins[name]['sha256'], 'source input actual HEAD pin')
        check_identity(root / name, row['identity'])
        original[name] = row['source']
    physical_rs = {p.relative_to(root).as_posix() for p in (root / 'src').rglob('*.rs') if p.is_file()}
    require(set(original) == physical_rs == {p for p in expected_git if p.startswith('src/') and p.endswith('.rs')} and
            len(original) <= limits['files'] and sum(len(u16(v)) // 2 for v in original.values()) <= limits['sourceUnits'], 'full physical/Git src census/limits')
    census = read(index['census']); fields(census, ['root', 'rows', 'sourceFiles', 'sourceUnits'], 'source census')
    actual_census = []
    def visit(path):
        value = path.lstat(); require(not path.is_symlink(), 'source census linked path')
        kind = 'directory' if stat.S_ISDIR(value.st_mode) else 'file' if stat.S_ISREG(value.st_mode) else None
        require(kind is not None, 'source census special file')
        actual_census.append({'path': path.relative_to(root).as_posix(), 'kind': kind, 'dev': value.st_dev, 'ino': value.st_ino, 'mode': value.st_mode})
        if kind == 'directory':
            for child in sorted(path.iterdir()): visit(child)
    visit(root / 'src')
    require(census == {'root': str(root), 'rows': actual_census, 'sourceFiles': len(original), 'sourceUnits': sum(len(u16(s)) // 2 for s in original.values())}, 'complete source directory census identity')
    cargo = {}
    require(len(index['dependencyInputs']) == 2, 'complete Cargo rows')
    for ref in index['dependencyInputs']:
        row = read(ref); fields(row, ['path', 'source', 'identity'], 'present Cargo input')
        name = row['path']; require(name in ['Cargo.toml', 'Cargo.lock'] and name not in cargo, 'Cargo input kind')
        raw = read_stable(regular(root, name), limits['fileBytes']); require(raw == row['source'].encode('utf8') and sha(raw) == pins[name]['sha256'], 'Cargo full physical/Git source')
        check_identity(root / name, row['identity'])
        cargo[name] = row['source']
    # The actual frozen owned source registry must name these complete inputs.
    registry=read_stable(regular(root,'tools/translation/router-core-source-data.mjs'),16*1024*1024).decode('utf8')
    for name,file in [('ROUTER_FORMATTING_FACADE_SOURCE','src/translation_core.rs'),('ROUTER_CORE_PRIMITIVES_SOURCE','src/translation_core/primitives.rs')]:
        matches=list(re.finditer(r'^export const '+name+r'\s*=\s*',registry,re.M));require(len(matches)==1,'unique owned source data declaration')
        value,end=json.JSONDecoder(object_pairs_hook=pairs).raw_decode(registry[matches[0].end():])
        require(isinstance(value,str) and registry[matches[0].end()+end:].startswith(';') and value==original[file],'full registered owned source/current input equality')
    # Independently reconstruct the source-only dependency digest, retaining the
    # actual complete archives/members. This still cannot reissue a private proof.
    derive_root=root/'tools/translation/source-profiles/derive'
    derive_raw=read_stable(regular(derive_root,'manifest.json'),16*1024*1024);derive_profile=parse(derive_raw)
    require(derive_profile['manifestSha256']==sha(cargo['Cargo.toml'].encode()) and derive_profile['lockSha256']==sha(cargo['Cargo.lock'].encode()),'exact original derive Cargo profile')
    derive_packages=[]
    for package in derive_profile['packages']:
        archive=read_stable(regular(derive_root,package['archive']),32*1024*1024)
        require(len(archive)==package['bytes'] and sha(archive)==package['sha256'],'complete pinned derive archive')
        checked=[]
        with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
            members=tar.getmembers();require(sum(member.size for member in members)<=8*1024*1024 and len(members)<=10000 and len({member.name for member in members})==len(members),'bounded derive complete archive census')
            for name,digest_ in package['members'].items():
                member=tar.getmember(package['name']+'-'+package['version']+'/'+name);require(member.isfile() and not member.issym() and member.size<=2*1024*1024,'bounded actual original derive member')
                raw=tar.extractfile(member).read();require(sha(raw)==digest_,'full actual original derive member pin');checked.append({'path':name,'sha256':digest_})
        derive_packages.append({'name':package['name'],'version':package['version'],'archiveSha256':package['sha256'],'members':checked})
    core_pin=derive_profile['standardCore'];core_encoded=read_stable(regular(derive_root,core_pin['archive']),1024*1024)
    with gzip.GzipFile(fileobj=io.BytesIO(core_encoded)) as stream:
        core_raw=stream.read(300001);require(len(core_raw)<=300000 and not stream.read(1),'original standard core source inflation bound')
    require(len(core_raw)==core_pin['bytes'] and sha(core_raw)==core_pin['sha256'],'complete pinned original standard core source')
    dependency_evidence={'schema':'locked-derive-dependencies-v1','manifestSha256':sha(cargo['Cargo.toml'].encode()),'lockSha256':sha(cargo['Cargo.lock'].encode()),'sourceProfileSha256':sha(derive_raw),'edition':derive_profile['rustEdition'],'rustVersion':derive_profile['rustVersion'],'features':derive_profile['dependencies'],'packages':derive_packages,'standardCore':{'url':core_pin['url'],'sha256':sha(core_raw)}}
    expected_dependency_digest=sha(encoded(dependency_evidence))
    profile_raw = read_stable(root / 'tools/translation/source-profiles/json-macro/manifest.json', 16 * 1024 * 1024)
    require(sha(profile_raw) == 'e42ec7a5f1358da8f077c9fdb77057b52cf6748d26cc4d2b8574e1afae4ae0af', 'exact registered JSON source profile')
    profile = parse(profile_raw); external = {}
    require(sha(cargo['Cargo.toml'].encode()) == profile['manifestSha256'] and sha(cargo['Cargo.lock'].encode()) == profile['lockSha256'], 'registered import Cargo profile')
    for package in profile['packages']:
        archive = read_stable(root / 'tools/translation/source-profiles/json-macro' / package['archive'], 32 * 1024 * 1024)
        require(len(archive) == package['bytes'] and sha(archive) == package['sha256'], 'registered original archive')
        with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
            members = tar.getmembers(); require(sum(m.size for m in members) <= 8 * 1024 * 1024 and len(members) <= 10000, 'bounded original archive census'); require(len({m.name for m in members}) == len(members), 'duplicate original archive members')
            for pin in package['members']:
                member = tar.getmember(package['name'] + '-' + package['version'] + '/' + pin['path'])
                require(member.isfile() and not member.issym() and member.size <= 2 * 1024 * 1024, 'regular bounded original member')
                raw = tar.extractfile(member).read(); require(len(raw) == pin['bytes'] and sha(raw) == pin['sha256'], 'complete registered original member')
                external[(package['name'], pin['path'])] = (raw.decode('utf8'), package)
    stage_schema = {'json-readers': 'router-owned-json-reader-corpus-v1'}
    proposal_trace = {'json-readers': ['canonical-json-readers:expand-option-and-then-on-shared-root','router-core:bind-generated-json-reader-paths']}
    require([stage['name'] for stage in index['stages']] == ['json-readers'], 'fixed complete singleton json-readers sequence')
    previous, stages, selections, edits = dict(original), [], [], []
    selected_functions=[]
    proposal_shapes = {'json-readers': ['file','before','intermediate','after','edits','mapping','stages','completeInverse','executableAdmission','trace','selections','preserved']}
    dependency_digest = None
    for stage in index['stages']:
        fields(stage, ['name', 'packets', 'summary', 'trace'], 'stage')
        name, packet = stage['name'], stage['packets']
        fields(packet, ['metadata', 'before', 'after', 'inputs', 'proposals', 'moduleGraph'], 'complete stage packet references')
        before, after = source_rows(packet['before']), source_rows(packet['after'])
        require(before == previous and set(after) == set(original), 'full stage source chain')
        metadata = read(packet['metadata']); values = reader_stage_metadata(metadata, before)
        require(values['schema'] == stage_schema[name] and values['entry'] == 'src/lib.rs' and values['compilationProfile'] == index['compilationProfile'] and values['executableAdmission'] is False, 'stage source-only contract')
        require(values['migrationSemantics']=='canonical shared Json Option equation, followed only by owned generated-path binding; fresh semantic checks required','explicit owned API adoption boundary')
        require(values['dependencyInputs']=={'manifest':cargo['Cargo.toml'],'lock':cargo['Cargo.lock']},'complete index-stage Cargo inputs retained')
        effect_selections = []
        if 'producerEffects' in values:
            effect = values['producerEffects']
            fields(effect, ['schema', 'dependencyInputs', 'dependenciesDigest', 'compilationProfile', 'deriveDiagnostics', 'bangDiagnostics', 'selections', 'runtimeAuthority', 'generatedImplBehavior'], 'complete producerEffects')
            require(effect['schema'] == 'core-adoption-original-producer-effects-v1' and effect['dependencyInputs'] == {'manifest': cargo['Cargo.toml'], 'lock': cargo['Cargo.lock']} and effect['compilationProfile'] == index['compilationProfile'] and effect['runtimeAuthority'] is False and effect['generatedImplBehavior'] is False, 'producerEffects source provenance/domain')
            digest(effect['dependenciesDigest']); require(effect['dependenciesDigest']==expected_dependency_digest,'full independently reconstructed original dependency digest'); dependency_digest = dependency_digest or effect['dependenciesDigest']; require(effect['dependenciesDigest'] == dependency_digest, 'stage dependency composition drift')
            require(all(isinstance(effect[k], list) for k in ['deriveDiagnostics', 'bangDiagnostics', 'selections']), 'producerEffects complete arrays')
            for selected in effect['selections']:
                fields(selected, ['file', 'module', 'sourceSha256', 'span', 'itemSha256', 'inputDigest', 'languageRule', 'completeInvocationDigest', 'retainedAlternatives', 'enclosingTypeBindings', 'enclosingUsableValueBindings', 'runtimeAuthority', 'generatedImplBehavior'], 'producer selected effect')
                require(selected['file'] in before and selected['sourceSha256'] == sha(before[selected['file']].encode()) and selected['itemSha256'] == sha(part(before[selected['file']], selected['span']).encode()) and selected['languageRule'] == 'rust.original-complete-derived-enclosing-name-effect.v1' and selected['enclosingTypeBindings'] == selected['enclosingUsableValueBindings'] == [] and selected['runtimeAuthority'] is False and selected['generatedImplBehavior'] is False, 'producer selected original source join')
                digest(selected['inputDigest']); digest(selected['completeInvocationDigest'])
                require(isinstance(selected['retainedAlternatives'], list) and 0 < len(selected['retainedAlternatives']) <= 256, 'retained complete output alternatives')
                for alt in selected['retainedAlternatives']:
                    fields(alt, ['invocation', 'kind', 'rootKinds'], 'producer retained alternative')
                    fields(alt['invocation'], ['path', 'attributeSpan'], 'original derive invocation')
                    a, b = span(alt['invocation']['attributeSpan'], len(u16(before[selected['file']])) // 2)
                    require(selected['span']['start'] <= a <= b <= selected['span']['end'], 'derive attribute/item source association')
                    require((alt['kind'] == 'ItemKind::Impl' and alt['rootKinds'] is None) or (alt['kind'] is None and isinstance(alt['rootKinds'], list) and alt['rootKinds'] and all(k in ['ItemKind::Impl', 'ItemKind::Const'] for k in alt['rootKinds'])), 'unknown complete output alternative kind')
            effect_selections = effect['selections']
        inputs = {}
        for ref in packet['inputs']:
            row = read(ref); key = 'file'; fields(row, [key, 'source', 'sha256'], 'full stage input')
            require(row[key] not in inputs and row[key] in before and row['source'] == before[row[key]] and row['sha256'] == sha(row['source'].encode()), 'stage full input bytes')
            inputs[row[key]] = row['source']
        require(inputs == before, 'complete stage input census')
        graph = packet['moduleGraph']; fields(graph, ['metadata', 'modules', 'edges', 'diagnostics', 'concreteSyntaxMeta'], 'complete graph packets')
        graphmeta = read(graph['metadata']); require(graphmeta == {'keys': ['modules', 'edges', 'diagnostics', 'concreteSyntaxMeta'], 'values': {}}, 'graph complete key order')
        modules, view_digests = {}, {}
        for ref in graph['modules']:
            module = read(ref); require(module['file'] in before and module['source'] == before[module['file']], 'graph complete original source')
            key = (module['file'], tuple(module['path'])); require(key not in modules, 'duplicate graph module')
            base_fields=['file','path','directory','pathDirectory','source','offset','items','compilationProfile','inactiveItems','configurationEvidence']
            require(set(module).issubset(set(base_fields+['sourceView','allItems','configurationCondition'])) and set(base_fields).issubset(module),'unknown graph module fields')
            require(module['compilationProfile']==index['compilationProfile'] and type(module['offset']) is int and module['offset']>=0,'graph module profile/offset')
            source = module['source']; source_units=u16(source); view = module.get('sourceView')
            if view is not None:
                require(list(view)==['schema','sourcePath','sourceSha256','modulePath','bodySpan','bodySha256','parentDigest','declaration','compilationProfile','configurationCondition','configurationEvidence','namespaceAuthority','attributeOwnerAuthority','runtimeAuthority','digest'],'source view complete evidence shape/order')
                require(isinstance(view['modulePath'],list) and (not view['modulePath'] or module['path'][-len(view['modulePath']):]==view['modulePath']) and view['compilationProfile']==index['compilationProfile'],'source view module/profile association')
                require(view['schema'] == 'original-source-module-view-v1' and view['sourcePath'] == module['file'] and view['sourceSha256'] == sha(source.encode()) and view['bodySha256'] == sha(part(source, view['bodySpan'], source_units).encode()) and view['namespaceAuthority'] is False and view['attributeOwnerAuthority'] is False and view['runtimeAuthority'] is False, 'source view full source/body association')
                require(view['digest'] == sha(encoded({k: v for k, v in view.items() if k != 'digest'})), 'source view complete evidence digest')
                if view['declaration'] is not None: require(view['declaration']['sha256'] == sha(part(source, view['declaration']['span'], source_units).encode()), 'inline declaration bytes')
                view_digests[view['digest']] = view
            for name_items in ['items', 'allItems']:
                for item in module.get(name_items, []):
                    span([item['start'], item['end']], len(source_units) // 2)
                    for token in item['tokens']: require(part(source, [token['start'], token['end']], source_units) == token['text'], 'complete original item token slice')
            modules[key] = {'source': source, 'view': view, 'items':module['items'], 'originalItems':module.get('allItems',module['items']), 'sourceUnits':len(source_units)//2}
        for selected in effect_selections:
            key=(selected['file'],tuple(selected['module']))
            require(key in modules and any([item['start'],item['end']]==[selected['span']['start'],selected['span']['end']] for item in modules[key]['items']),'producer effect actual graph declaration association')
        for module in modules.values():
            view = module['view']
            if view and view['parentDigest'] is not None:
                require(view['parentDigest'] in view_digests,'inline source view parent retained')
                parent=view_digests[view['parentDigest']]
                require(parent['sourcePath']==view['sourcePath'] and parent['modulePath']==view['modulePath'][:-1] and parent['bodySpan']['start']<=view['declaration']['span']['start']<=view['declaration']['span']['end']<=parent['bodySpan']['end'],'inline exact parent/source/declaration association')
        edges, diagnostics = read(graph['edges']), read(graph['diagnostics'])
        require(isinstance(edges, list) and isinstance(diagnostics, list), 'complete graph edge/diagnostic arrays')
        concrete = {}
        for ref in graph['concreteSyntaxMeta']:
            row = read(ref); fields(row, ['source', 'document'], 'graph concrete row'); require(row['source'] in before, 'graph concrete source path'); check_cst(row['document'], before[row['source']]); concrete.setdefault(row['source'], []).append(ref)
        require(set(concrete) == {file for file, path in modules}, 'all physical graph inputs have complete CST')
        # This is a complete data-census join, never a private namespace permit.
        # The actual selector excludes this exact core path family, then skips
        # a physical file iff its complete graph has other than one root view.
        noncore={file for file in before if file!='src/translation_core.rs' and not file.startswith('src/translation_core/')}
        origin_counts={file:0 for file in noncore}
        for (file,path),module in modules.items():
            if file not in noncore:continue
            view=module['view']
            require(isinstance(view,dict) and isinstance(view['modulePath'],list),'complete reader source view required for physical-origin census')
            if not view['modulePath']:
                require(view['sourcePath']==file and view['parentDigest'] is None and view['declaration'] is None and view['bodySpan']=={'start':0,'end':len(u16(before[file]))//2},'physical-origin view retains complete original source root')
                origin_counts[file]+=1
        require(isinstance(values['skipped'],list),'complete skipped rows must be an array')
        skipped_files=set()
        for skipped in values['skipped']:
            fields(skipped,['file','reason'],'exact reader skipped row')
            file=skipped['file']
            require(isinstance(file,str) and file in noncore and file not in skipped_files,'unique current noncore original skipped file')
            require(skipped['reason']=='one complete physical source origin required' and origin_counts[file]!=1,'skipped reason rejoins actual complete graph physical-origin census')
            skipped_files.add(file)
        require(skipped_files=={file for file,count in origin_counts.items()if count!=1},'complete skipped physical-origin census, no omitted or invented rows')
        seen, count_edits, count_selections, changed = set(), 0, 0, 0
        for ref in packet['proposals']:
            row = read(ref); fields(row,proposal_shapes[name],'complete per-file proposal'); file = row['file']; require(file not in seen and file in before, 'proposal file uniqueness'); seen.add(file)
            require(isinstance(row['preserved'],list),'complete retained index uncertainty array')
            language_edits,subjects=check_reader_selections(row, before[file], modules, external, {'manifestSha256':profile['manifestSha256'],'lockSha256':profile['lockSha256'],'profileSha256':sha(profile_raw)})
            selected_functions.extend(subjects)
            a, b, count, doc = reader_proposal(row, before[file], proposal_trace[name],language_edits); require(b == after[file], 'complete per-file after source chain')
            require(file in concrete, 'proposal physical original CST missing')
            for cref in concrete[file]: require(read(cref)['document'] == doc, 'full graph/proposal before CST equality')
            count_edits += count; count_selections += len(row['selections']); changed += int(a != b)
            selections.extend({'stage': name, 'path': file, 'selection': s} for s in row['selections'])
            edits.extend({'stage': name, 'path': file, **edit} for edit in row['edits'])
        require(seen==noncore-skipped_files,'proposals and skips partition every current noncore original file')
        for file in set(before) - seen: require(before[file] == after[file], 'unproposed source changed')
        summary = {'sourceFiles': len(before), 'proposals': len(seen), 'selections': count_selections, 'edits': count_edits, 'changedFiles': changed, 'skippedFiles': len(values['skipped'])}
        require(summary == stage['summary'], 'complete stage summary counts')
        trace(stage['trace'], ['core-adoption:prepare-json-readers-corpus-stream', 'core-adoption:json-readers-stream-complete-packets'])
        stages.append({'name': name, **summary, 'producerEffectSelections': len(effect_selections)}); previous = after
    changes = {}
    for row in index['changes']: require(row['path'] not in changes, 'duplicate final changed path'); changes[row['path']] = row
    require(set(changes) == {file for file in original if original[file] != previous[file]}, 'exact actual final changes census')
    plan = []
    for file, row in changes.items():
        fields(row, ['path', 'beforeSha256', 'afterSha256', 'source'], 'final changed source')
        raw = previous[file].encode(); require(row['beforeSha256'] == sha(original[file].encode()) and row['afterSha256'] == sha(raw), 'final complete source hashes')
        ref = row['source']; require(ref == records[ref['path']] and ref['kind'] == 'rust-source', 'exact raw output packet reference')
        require(storage.read(ref) == raw, 'full actual producer after bytes')
        used.add(ref['path']); plan.append({'path': file, 'beforeSha256': row['beforeSha256'], 'afterSha256': row['afterSha256'], 'bytes': len(raw), 'producerSource': str(storage.path(ref)), 'storageEncoding':'gzip', 'logicalPacket':dict(ref), 'storedPacket':dict(storage.rows[ref['path']])})
    reverse_sources=dict(previous)
    for stage in reversed(index['stages']):
        for ref in stage['packets']['proposals']:
            row=read(ref);file=row['file'];require(reverse_sources[file]==row['after']['source'],'reverse complete stage source join')
            units=u16(reverse_sources[file])
            for mapping in reversed(row['mapping']):
                if mapping['kind']=='substitution':
                    a,b=mapping['after'];require(units[a*2:b*2]==u16(mapping['replacement']),'whole-chain inverse exact selector');units=units[:a*2]+u16(mapping['expected'])+units[b*2:]
            reverse_sources[file]=units.decode('utf-16-le');require(reverse_sources[file]==row['before']['source'],'whole-chain inverse full source')
    require(reverse_sources==original,'the complete singleton index stage inverts to every original input')
    manifest=parse(read_stable(root/'tools/translation/fixtures/real-source-provenance.json',16*1024*1024))
    original_paths={row[k] for row in manifest['entries'] for k in ['path','testSource'] if row.get(k)}
    fixture_preparer=read_stable(regular(root,'tools/translation/prepare-real-source-fixtures.mjs'),1024*1024).decode('utf8')
    expected_core=['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','Cargo.toml','Cargo.lock']
    core_declaration=re.search(r'^const CORE=(\[[^\n]+\]);$',fixture_preparer,re.M)
    require(core_declaration and core_declaration[1]==repr(expected_core).replace(', ',','),'actual reviewed six-path fixture CORE declaration')
    current_paths=original_paths|{'src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','Cargo.toml','Cargo.lock'}
    require(len(original_paths)==15 and len(current_paths)==21,'real-source fixture manifest15/current21 pathset changed')
    closure={'originalParents15':sorted(original_paths),'currentSourceClosure21':sorted(current_paths),'changedOriginalParents':sorted(set(changes)&original_paths),'changedCurrentSourceClosure':sorted(set(changes)&current_paths),'requiredAction':'If either intersection is nonempty: append the separately reviewed actual application adoption commit to prepare-real-source-fixtures ADOPTIONS, verify continuous complete before/after lineage, and run the actual source-fixture producer for fresh assets and notices. This review neither changes nor bypasses historical lineage.'}
    require(used == set(records), 'orphaned/unreviewed packet reference')
    require(git('rev-parse', 'HEAD').decode().strip() == head and not git('status', '--porcelain'), 'final source HEAD/clean rejoin')
    for name, source in original.items(): require(read_stable(regular(root, name), limits['fileBytes']) == source.encode(), 'final complete physical source rejoin')
    for name, source in cargo.items(): require(read_stable(regular(root, name), limits['fileBytes']) == source.encode(), 'final Cargo rejoin')
    for name in sorted(physical_inputs):
        path=regular(compiler,name[len(prefix):]) if name.startswith(prefix) else regular(root,name)
        raw=read_stable(path,128*1024*1024);require(len(raw)==pins[name]['bytes'] and sha(raw)==pins[name]['sha256'],'final all captured physical bytes '+name)
    require({p.relative_to(compiler).as_posix() for p in compiler.rglob('*') if p.is_file()}=={p[len(prefix):] for p in pins if p.startswith(prefix)} and all(not p.is_symlink() for p in compiler.rglob('*')),'final complete TypeScript physical census')
    for name in records: require(identity(storage.path(records[name])) == packet_states[name], 'final proposal identity rejoin')
    storage.finish()
    require(captured_full_snapshots(root,run,pins,head)==snapshot_digests,'final complete retained snapshot/receipt rejoin')
    require(read_stable(payload / 'index.json', limits['packetBytes']) == index_raw, 'final complete index bytes')
    require(read_stable(run/'inputs.json',16*1024*1024)==captured_raw,'final captured compiler input vector bytes')
    summary = {'schema': 'complete-json-readers-gzip-producer-review-v1', 'sourceHead': head, 'indexSha256': sha(index_raw), 'capturedInputsSha256':sha(captured_raw), 'sourceFiles': len(original), 'capturedInputs': len(pins), 'installedTypeScriptFiles': 132, 'packets': len(records), 'packetBytes': total, 'stages': stages, 'sourceClosure':closure, 'changedFiles': len(plan), 'deriveSourceProfileSha256':sha(derive_raw), 'sourceOnlyDependenciesDigest':expected_dependency_digest, 'completeReaderEquationsAndGeneratedPathBindingsChecked':True, 'uniqueSelectedCompleteFunctions':len({(row['file'],tuple(row['module']),tuple(row['beforeSpan']))for row in selected_functions}), 'selectedCompleteFunctions':selected_functions, 'selectionIsNotExecutableCoverage':True, 'allTrackedRustCargoGuards':sum(p.endswith('.rs')or p in ['Cargo.toml','Cargo.lock']for p in pins), 'compressedStoredPacketBytes':storage.stored_bytes, 'retainedSnapshotDigests':snapshot_digests, 'completeFullPacketBytesAndSourceChainsChecked': True, 'fullUtf16Utf8LeafGroupParentPartitionsChecked': True, 'allCompleteSourceInversesChecked': True, 'semanticAdmission': False, 'privateIssuerReexecution': False, 'authorityBoundary': 'Source/data review only; private owner/grammar issuance remains the actual pinned producer execution, not copied flags or this Python verifier.', 'RustExecuted': False, 'JavaScriptExecuted': False}
    # Reports only. The verifier never installs or changes a source/proposal.
    args.report.mkdir(parents=True, exist_ok=False)
    (args.report / 'review.json').write_text(json.dumps(summary, indent=2) + '\n')
    (args.report / 'installation-plan.json').write_text(json.dumps({'indexSha256': sha(index_raw), 'files': sorted(plan, key=lambda row: row['path']), 'selections': selections, 'edits': edits}, ensure_ascii=True, indent=2) + '\n')
    print(json.dumps(summary), flush=True)

if __name__ == '__main__':
    main()
