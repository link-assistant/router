#!/usr/bin/env python3
"""Publish the actual Clap/route/type inventory. --check rejects stale artifacts."""
import argparse
import copy
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFT = 'https://json-schema.org/draft/2020-12/schema'


def obj(properties, required=()):
    return {'type': 'object', 'properties': properties, 'required': list(required), 'additionalProperties': False}


def array(items):
    return {'type': 'array', 'items': items}


STRING = {'type': 'string'}
BOOL = {'type': 'boolean'}
INT = {'type': 'integer'}
OUTPUT = obj({'output': array(STRING)}, ['output'])


def strict(schema):
    if isinstance(schema, dict):
        if schema.get('type') == 'object' and 'properties' in schema:
            schema['additionalProperties'] = False
        for child in schema.values():
            strict(child)
    elif isinstance(schema, list):
        for child in schema:
            strict(child)
    return schema


def generate(catalog):
    assert catalog.get('types'), 'Router binary does not export derived contract types; rebuild it'
    outputs = {}

    def write(path, document):
        outputs[path] = document if isinstance(document, str) else json.dumps(document, indent=2, sort_keys=True) + '\n'

    types = copy.deepcopy(catalog['types'])
    # Preserve $defs inside each independently valid JSON Schema. OpenAPI uses
    # renamed components so generators do not depend on unsupported nested defs.
    components = {}
    for name, schema in types.items():
        schema = strict(schema)
        definitions = schema.pop('$defs', {})
        schema.pop('$schema', None)
        def rewrite(value):
            if isinstance(value, dict):
                # Composite defaults are annotations, and the Go generator
                # currently renders them as invalid struct initializers.
                if isinstance(value.get('default'), (dict, list)):
                    value.pop('default')
                if value.get('$ref', '').startswith('#/$defs/'):
                    value['$ref'] = '#/components/schemas/' + name + '_' + value['$ref'].split('/')[-1]
                for child in value.values(): rewrite(child)
            elif isinstance(value, list):
                for child in value: rewrite(child)
        rewrite(schema)
        for key, value in definitions.items():
            rewrite(value)
            components[name + '_' + key] = value
        components[name] = schema
    ref = lambda name: {'$ref': '#/components/schemas/' + name}
    issue = obj({key: {} for key in ['token', 'ttl_hours', 'label', 'account', 'max_requests', 'max_tokens', 'rate_limit_per_minute', 'scope']}, ['token'])
    issue['properties']['token'] = STRING
    components.update({
        'Output': OUTPUT,
        'Version': obj({'version': STRING, 'source_commit': {'type': 'string', 'pattern': '^([a-f0-9]{40}|unknown)$'}}, ['version', 'source_commit']),
        'AnthropicError': obj({'type': {'const': 'error'}, 'request_id': STRING, 'error': obj({'type': STRING, 'message': STRING, 'outcome': STRING}, ['type', 'message'])}, ['type', 'error']),
        'OpenAiError': obj({'type': {'const': 'error'}, 'request_id': STRING, 'error': obj({'type': STRING, 'message': STRING, 'code': {'type':['string','null']}, 'param': {'type':['string','null']}}, ['type','message'])}, ['error']),
        'GeminiError': obj({'error': obj({'code': INT,'message':STRING,'status':STRING}, ['code','message','status'])}, ['error']),
        'GitHubError': obj({'message':STRING}, ['message']),
        'OpaqueVendorPayload': {'description':'Native vendor payload passed through unchanged. Vendor-defined extensions are intentional.', 'x-router-opaque-vendor-payload':True},
        'ProviderProvisionResponse': obj({**components['ProviderRecord']['properties'], 'outcome':{'enum':['created','replaced','already_present']}}, [*components['ProviderRecord'].get('required',[]), 'outcome']),
        'TokenIssued': issue,
        'ClientTokenIssued': obj({key:{} for key in ['token','ttl_hours','label','client_kind','principal_id','model_policy']}, ['token','client_kind','principal_id']),
        'AdminSummary': obj({key:{} for key in ['version','upstream_provider','upstream_base_url','accounts','claude_credential','subscription','login_api_enabled','admin','emergency_auth']}, ['version','admin']),
        'Accounts': obj({'accounts':array(obj({key:{} for key in ['name','home','healthy','credential','used','request_limit','remaining_requests','last_error','cooldown_remaining_seconds','cooldown_reason','cooldown_until_unix','model_cooldowns','paused','pause','windows']}, ['name','healthy'])), 'credentials':array(obj({'name':STRING,'home':STRING,'credential':STRING,'healthy':BOOL}, ['name','healthy'])), 'note':STRING}, ['accounts']),
        'AccountPause': obj({'account':STRING,'paused':BOOL,'until_unix':{'type':['integer','null']}}, ['account','paused']),
        'AccountResume': obj({'account':STRING,'paused':BOOL,'was_paused':BOOL}, ['account','paused','was_paused']),
        'SubscriptionHealth': obj({'status':STRING,'starting_providers':array(STRING),'healthy_providers':array(STRING),'degraded_providers':array(obj({'provider':STRING,'reason':STRING,'state':STRING,'upstream_code':STRING}, ['provider','reason']))}, ['status','healthy_providers','degraded_providers']),
        'Health': obj({'status':STRING, 'version':STRING}, ['status']),
        'Bootstrap':obj({'claim_id':STRING,'token':STRING,'expires_in_secs':INT,'ttl_hours':INT,'confirm_url':STRING}, ['claim_id','token','expires_in_secs','ttl_hours','confirm_url']),
        'Confirmed':obj({'claimed':BOOL}, ['claimed']),
        'Revoked':obj({'revoked':STRING}, ['revoked']),
        'Deleted':obj({'deleted':STRING}, ['deleted']),
        'Rotated':obj({'token':STRING,'ttl_hours':INT,'label':STRING,'scope':STRING,'revoked':STRING}, ['token','revoked']),
        'ClientRotated':obj({'token':STRING,'revoked':STRING}, ['token','revoked']),
        'AdminRotated':obj({'token':STRING,'token_id':{'type':['string','null']},'credential_kind':STRING}, ['token','credential_kind']),
        'RunLease':obj({'run_lease_expires_at':INT}, ['run_lease_expires_at']),
        'Models':obj({**{key:{} for key in ['healthy_providers','starting_providers','degraded_providers','degraded_reasons','catalog_conflicts','catalog_conflict_candidates','using_fallback']}, 'model_policy': ref('TokenRecord_ModelAccessPolicy'), 'object':STRING,'data':array({'type':'object'}),'has_more':BOOL,'first_id':{'type':['string','null']},'last_id':{'type':['string','null']}}, ['data']),
        'NativeModels':obj({'models':array({'type':'object'})}, ['models']),
        'ManagementReport':obj({key:{} for key in ['accounts','credentials','providers','tokens','total_requests','total_input_tokens','total_output_tokens','total_tokens','total_cached_tokens','total_cost_usd','uptime_seconds','surfaces','by_provider','by_token','total','recent','failures','counters','enabled','remaining_seconds','duration_minutes','started_at','expires_at','disabled','status','session_id','id','url','auth_url','verification_uri','user_code','expires_in','message','error','output','provider','mode','reason','credential_kind','code','refresh','last_failure']})
    })
    components.update({
        'OperationCatalog': obj({key:{} for key in ['schema','version','operations','routes','languages','types']}, ['schema','version','operations','routes','languages','types']),
        'Verification': obj({key:{} for key in ['schema','router_version','router_commit','commit','generated_at_unix','complete','failed','skipped','areas_not_run','targets_not_run','os','arch','prepared_at','generated_at','started_at','finished_at','duration_seconds','areas','client_preparation','require_parity','overall','parity','client_filter','summary']}, ['schema','areas']),
        'Recovery':obj({'recovered':BOOL,'token':STRING,'token_id':STRING,'revoked':array(STRING),'retained_admins':INT,'error':STRING}, ['recovered']),
        'ResetRow':obj({key:{} for key in ['client','profile','mode','categories','ambient_overrides','status','reason','targets','checked','preserved','backup_id','full','dry_run']}, ['client','profile','status']),
        'RepairReport':obj({key:{} for key in ['dry_run','plans','errors','results','client','changed','backup_id','status','rolled_back','path','state','action','conflicts','files','transaction_id','reason'] }),
        'LogSummary':obj({**{key:INT for key in ['exchanges','records','bytes','streamed','non_streamed','incomplete_streams','unterminated_streams','unverifiable_streams','unparsable_records','undecodable_bodies']},'statuses':{'type':'object','additionalProperties':INT}}),
        'LogAnomaly':obj({'kind':STRING,'detail':STRING,'correlation_ids':array(STRING)}, ['kind','detail','correlation_ids']),
        'DeploymentEvent':obj({key:{} for key in ['schema','namespace','status','root','origin','control_health','serving_health','port_ownership','active_port_owners','catalogs','oauth_ownership','primary_preservation','real_claude_models_and_picker','resource_limits','parity','reason','data_retained','cleanup_scope','mode','previous_checkpoint','oauth_restored','global_atomic_snapshot','data_restore_proven','checkpoint','checkpoint_scope','credential_source','credentials_copied','profiles_projects_sessions','rollback_scope','oauth_copied','blocker','issued_bound_tokens','catalog_comparison','access_loss_explicitly_accepted']}, ['schema']),
    })
    components['RemoteDeployment'] = obj({key:{} for key in ['schema','target','server','mode','instance','status','exit_code','env','provider_keys','verification','deploy_token','steps','subprocesses','timings','output','seed_credentials']}, ['schema','target','server','mode','status','exit_code'])
    nullable = lambda shape: {'anyOf': [shape, {'type': 'null'}]}
    local_status = {
        'schema': {'const':'link-assistant-router/local-deployment/v1'},
        'mode': {'enum':['host','container']},
        'status': {'enum':['absent','legacy','managed','planned','inconsistent','interrupted']},
        'deployment_root': STRING, 'candidate_image': STRING,
        'listener': obj({'host':STRING,'port':INT}, ['host','port']),
        'host_router': nullable(obj({'executable':STRING,'version':STRING}, ['executable','version'])),
        'host_process': nullable(obj({'pid':INT,'port':INT,'version':STRING,'executable':STRING,'serving':BOOL}, ['pid','port','version','executable','serving'])),
        'backend': nullable(obj({'name':STRING,'image':nullable(STRING),'running':BOOL}, ['name','image','running'])),
        'relay': nullable(obj({'name':STRING,'port':INT,'running':BOOL}, ['name','port','running'])),
        'converged': nullable(BOOL), 'connections': nullable(INT),
        'runs': nullable(array(obj({'id':STRING,'label':STRING,'state':STRING,'lease_expires_at':nullable(INT)}, ['id','label','state','lease_expires_at']))),
        'blockers': array(obj({'name':STRING,'reason':STRING,'forceable':BOOL}, ['name','reason','forceable'])),
        'force_update_interrupts':BOOL, 'token_secret':nullable(STRING),
        'rollback_command':nullable(STRING), 'status_is_read_only':BOOL,
        'transaction': nullable(obj({'version':INT,'phase':STRING,'previous':nullable(STRING),'previous_kind':STRING,'previous_port':nullable(INT),'candidate':STRING,'image_ref':STRING,'image_id':STRING,'port':INT}, ['version','phase','previous','previous_kind','previous_port','candidate','image_ref','image_id','port'])),
    }
    components['LocalDeployment'] = obj(local_status, list(local_status))
    target = obj({'target': STRING, 'status': STRING, 'passed': INT, 'failed': INT, 'ignored': INT}, ['target', 'status', 'passed', 'failed', 'ignored'])
    skip = obj({'tier': STRING, 'test': STRING, 'reason': STRING}, ['tier', 'test', 'reason'])
    area = obj({'name': STRING, 'covers': STRING, 'status': STRING, 'ran': BOOL, 'passed': INT, 'failed': INT, 'ignored': INT, 'skipped': array(skip), 'not_run': array(STRING), 'targets': array(target), 'enable_skipped_with': STRING, 'commands': array(STRING), 'log': STRING, 'reason': STRING, 'enable_with': STRING}, ['name', 'status', 'ran'])
    unexecuted_area = obj({'name': STRING, 'reason': STRING, 'enable_with': STRING}, ['name', 'reason', 'enable_with'])
    preparation = obj({'client': STRING, 'expected': {'type':['string','null']}, 'observed': {'type':['string','null']}, 'status': STRING, 'reason': STRING, 'source': {'enum':['installed','ci-pin','latest']}, 'host_installed': {'type':['string','null']}, 'host_mismatch': BOOL}, ['client','expected','observed','status','reason','source','host_installed','host_mismatch'])
    components['Verification'] = obj({'schema': {'const':'link-assistant-router/verification/v1'}, 'router_version': nullable(STRING), 'commit': {'type':['string','null']}, 'generated_at_unix': INT, 'complete': BOOL, 'parity': BOOL, 'failed': BOOL, 'skipped': INT, 'areas_not_run': array(unexecuted_area), 'targets_not_run': array(STRING), 'areas': array(area), 'client_preparation': array(preparation)}, ['schema','router_version','commit','generated_at_unix','complete','parity','failed','skipped','areas_not_run','targets_not_run','areas','client_preparation'])
    response_types = {
        ('Usage','GET'):ref('UsageSnapshot'), ('CredentialStatus','GET'):obj({'credentials':array(ref('CredentialAcceptanceReport'))}, ['credentials']),
        ('AuthDiagnostics','GET'):obj({'diagnostics':ref('AuthDiagnosticsSnapshot'),'emergency_auth':ref('EmergencyStatus')}, ['diagnostics','emergency_auth']),
        ('EmergencyAuthStatus','GET'):ref('EmergencyStatus'), ('EmergencyAuthDisable','POST'):obj({'disabled':BOOL,'was_active':BOOL,'status':ref('EmergencyStatus')}, ['disabled','was_active','status']),
        ('Login','POST'):ref('LoginView'), ('LoginSession','GET'):ref('LoginView'), ('LoginSession','DELETE'):obj({'cancelled':STRING}, ['cancelled']),
        ('LoginCode','POST'):ref('LoginView'), ('Providers','POST'):ref('ProviderProvisionResponse'),
        ('Health','GET'):ref('Health'), ('Tokens','GET'):obj({'data':array(ref('TokenRecord'))}, ['data']),
        ('Tokens','POST'):ref('TokenIssued'), ('ClientTokens','POST'):ref('ClientTokenIssued'),
        ('Providers','GET'):obj({'data':array(ref('ProviderRecord'))}, ['data']), ('Provider','GET'):ref('ProviderRecord'),
        ('Provider','DELETE'):ref('Deleted'), ('RevokeToken','POST'):ref('Revoked'), ('RotateToken','POST'):ref('Rotated'),
        ('RotateClientToken','POST'):ref('ClientRotated'), ('RunLease','POST'):ref('RunLease'),
        ('SubscriptionUsage','GET'):ref('UsageEnvelope'), ('SubscriptionUsageProvider','GET'):ref('UsageEnvelope'),
        ('AdminStatus','GET'):ref('AdminStatus'), ('AdminSummary','GET'):ref('AdminSummary'),
        ('AdminBootstrap','POST'):ref('Bootstrap'), ('AdminBootstrapConfirm','POST'):ref('Confirmed'), ('AdminRotate','POST'):ref('AdminRotated'),
        ('Routing','PATCH'):ref('RoutingSettings'), ('CooldownReset','POST'):ref('CooldownResetResult'),
        ('Accounts','GET'):ref('Accounts'), ('AccountPause','POST'):ref('AccountPause'), ('AccountResume','POST'):ref('AccountResume'),
        ('SubscriptionHealth','GET'):ref('SubscriptionHealth'), ('AggregateModels','GET'):ref('Models'),
    }
    components['AggregateModel'] = obj({key:{} for key in ['id','service','owned_by','selector_kind','variant_of','router_available','router_unavailable_reason','metadata_fetched_at','provider_created_at','context_window','max_output_tokens','modalities','pricing','deprecation_date','default_reasoning_level','supported_reasoning_levels','client_capabilities','capability_provenance']}, ['id','service','owned_by','capability_provenance'])
    components['AggregateModels'] = copy.deepcopy(components['Models'])
    components['AggregateModels']['properties']['data'] = array(ref('AggregateModel'))
    components['AggregateModels']['properties']['catalog_conflict_candidates'] = array(ref('AggregateModel'))
    response_types[('AggregateModels','GET')] = ref('AggregateModels')
    request_types = {'Routing':'RoutingUpdate','CooldownReset':'CooldownReset','Login':'BeginLoginRequest','LoginCode':'SubmitCodeRequest','Tokens':'IssueTokenRequest','ClientTokens':'IssueClientTokenRequest','RevokeToken':'RevokeTokenRequest','RotateToken':'RotateTokenRequest','RotateClientToken':'RotateClientTokenRequest','Providers':'ProviderUpsert','AdminBootstrap':'TtlRequest','AdminRotate':'TtlRequest','AdminBootstrapConfirm':'ConfirmRequest'}
    paths = {}
    any_methods = {}
    for route in catalog['routes']:
        path = route['path'].replace('{*', '{')
        methods = ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD','TRACE'] if route['method']=='ANY' else ['GET','HEAD'] if route['method']=='GET' else [route['method']]
        if route['method']=='ANY':
            any_methods[path] = {'description':'The native catch-all accepts any valid HTTP method with the referenced authentication and response contracts. Successful CONNECT has no body; its explicit contract is below.', '$ref':'#/paths/'+path.replace('~','~0').replace('/','~1')+'/get'}
        for method in methods:
            success = response_types.get((route['name'],method), ref('ManagementReport') if route['class']=='Management' else ref('OpaqueVendorPayload'))
            if route['name'].endswith('Models') and route['name'] != 'AggregateModels':
                success = ref('NativeModels' if route['name'] in ['CodexModels','GeminiModels'] else 'Models')
            identifier = re.sub(r'[^a-zA-Z0-9]+','_', method.lower()+'_'+path).strip('_')
            content = {'application/json': {'schema':success}}
            if route['name'] in ['Health', 'Metrics']: content = {'text/plain':{'schema':STRING}}
            if route['class'].startswith('Service') and method=='POST':
                content['text/event-stream']={'schema':STRING, 'x-router-event-schema':ref('OpaqueVendorPayload')}
            op = {'operationId':identifier,'summary':route['name'],'tags':[route['class'].split('(')[0]], 'security':[] if route['auth']=='None' else [{'AdminBearer' if route['auth']=='Admin' else 'RouterBearer':[]}], 'x-router-route':route,
                'responses':{'200':{'description':'Success','content':content},'default':{'description':route['dialect']+' failure envelope','content':{'application/json':{'schema':ref(route['dialect']+'Error')}}}},
                'parameters':[{'name':parameter,'in':'path','required':True,'schema':STRING, 'description':'Wildcard path segments' if '{*'+parameter+'}' in route['path'] else 'Path parameter'} for parameter in re.findall(r'{([^}]+)}',path)]}
            if method in ['POST','PUT','PATCH']:
                op['requestBody']={'required':False,'content':{'application/json':{'schema':ref(request_types.get(route['name'],'OpaqueVendorPayload'))}}}
            if '/realtime' in path or path.endswith('/responses') and method=='GET': op['x-router-websocket']={'upgrade':'websocket','events':ref('OpaqueVendorPayload')}
            if route['auth']=='Client': op['security'] += [{'RouterApiKey':[]},{'RouterGoogleKey':[]}]
            if method=='HEAD':
                for response in op['responses'].values(): response.pop('content', None)
            paths.setdefault(path,{})[method.lower()] = op
        if route['method']=='ANY':
            connect = copy.deepcopy(paths[path]['get'])
            connect['operationId'] = connect['operationId'].replace('get_', 'connect_', 1)
            connect['responses']['200'].pop('content')
            any_methods[path]['connect'] = connect
    # The admin listener has an embedded asset fallback instead of the public 404.
    paths['/']={'get':{'operationId':'get_admin_ui','summary':'Admin UI entry point','security':[],'responses':{'200':{'description':'Embedded UI','content':{'text/html':{'schema':STRING}}}}, 'x-router-listeners':['Admin']}}
    paths['/']['head'] = copy.deepcopy(paths['/']['get'])
    paths['/']['head']['operationId'] = 'head_admin_ui'
    paths['/']['head']['responses']['200'].pop('content')
    spec = {'openapi':'3.1.0','jsonSchemaDialect':DRAFT,'info':{'title':'Link.Assistant.Router HTTP API','version':catalog['version']},'servers':[{'url':'http://127.0.0.1:8080'}], 'paths':paths,'components':{'schemas':components,'securitySchemes':{'RouterBearer':{'type':'http','scheme':'bearer','bearerFormat':'la_sk JWT'},'AdminBearer':{'type':'http','scheme':'bearer','description':'Admin scoped JWT or provisioned TOKEN_ADMIN_KEY'},'RouterApiKey':{'type':'apiKey','in':'header','name':'x-api-key'},'RouterGoogleKey':{'type':'apiKey','in':'header','name':'x-goog-api-key'}}}, 'x-router-streams':{'sse':{'framing':'UTF-8 event/data records separated by a blank line','events':['message_start','content_block_start','content_block_delta','content_block_stop','message_delta','message_stop','error','response.created','response.output_text.delta','response.completed','response.failed','[DONE]']},'websocket':{'framing':'JSON text frames; native vendor event payloads','upgradeStatus':101}}}
    spec['x-router-any-methods'] = any_methods
    write('openapi/router.yaml',spec)
    embedded = ['//! Generated offline contracts; regenerate with scripts/generate-contracts.py.', '#[rustfmt::skip]', 'pub(super) const CLI_SCHEMAS: &[(&str, &str)] = &[']
    for operation in catalog['operations'] + [{'name':'cli-error'}]:
        embedded.append('    ('+json.dumps(operation['name'])+', include_str!("../../schemas/'+operation['name'].replace('.', '-')+'.v1.json")),')
    embedded += ['];','pub(super) const HTTP: &str = include_str!("../../openapi/router.yaml");','']
    write('src/contracts/generated.rs', '\n'.join(embedded))
    write('schemas/operation-catalog.v1.json',catalog)
    # Components are copied into each response schema so validation is offline.
    for operation in catalog['operations'] + [{'name':'cli-error','schema':'link-assistant-router/cli-error/v1'}]:
        name=operation['name']
        data = OUTPUT
        if name=='version': data=ref('Version')
        elif name in ['tokens.issue','tokens.rotate']: data=obj({'token':STRING}, ['token'])
        elif name=='tokens.list': data=array(ref('TokenRecord'))
        elif name=='tokens.show': data=ref('TokenRecord')
        elif name=='providers.list': data=array(ref('ProviderRecord'))
        elif name=='providers.show': data=ref('ProviderRecord')
        elif name=='providers.add': data=ref('ProviderProvisionResponse')
        elif name=='usage': data=ref('UsageEnvelope')
        elif name=='contracts': data=ref('OperationCatalog')
        elif name=='verify': data=ref('Verification')
        elif name=='with': data=obj({'client_exit_code':{'type':['integer','null']},'stdout':STRING,'stderr':STRING}, ['client_exit_code','stdout','stderr'])
        elif name=='clients.list': data=array(ref('ClientStatus'))
        elif name=='clients.show': data=ref('ClientStatus')
        elif name in ['clients.install','clients.update','clients.reinstall']: data=array(ref('MaintenancePlan'))
        elif name=='clients.backup.list': data=array(ref('BackupManifest'))
        elif name=='tokens.import': data=ref('TokenImportReport')
        elif name=='auth.import': data=ref('AuthImportReport')
        elif name=='tokens.recover-admin': data=ref('Recovery')
        elif name=='accounts.list': data={'anyOf':[array(components['Accounts']['properties']['accounts']['items']),ref('Accounts')]}
        elif name=='clients.reset': data=array(ref('ResetRow'))
        elif name=='clients.repair': data=ref('RepairReport')
        elif name=='logs.summary': data=ref('LogSummary')
        elif name=='logs.anomalies': data=array(ref('LogAnomaly'))
        elif name=='deploy': data={'anyOf':[ref('DeploymentEvent'), ref('RemoteDeployment'), ref('LocalDeployment'), OUTPUT]}

        reports = {'doctor': 'DoctorReport', 'auth.status': 'AuthStatusReport', 'clients.doctor': 'ClientDoctorReport', 'logs.show': 'LogRecordsReport', 'tunnel.status': 'TunnelStatusReport', 'server.status': 'ServerStatusReport', 'models.explain': 'ModelExplanationReport', 'clients.backup.verify': 'BackupVerificationReport'}
        variants = [data, OUTPUT]
        if name in reports: variants.append(ref(reports[name]))
        if name == 'clients.backup.list': variants.append(array(STRING))

        schema={'$schema':DRAFT,'$id':operation['schema'], **obj({'schema':{'const':operation['schema']},'operation':{'const':name},'success':BOOL,'exit_code':{'type':'integer','minimum':0,'maximum':255},'data':{'anyOf':variants},'diagnostics':array(STRING)}, ['schema','operation','success','exit_code','data','diagnostics']), '$defs':components, 'allOf':[{'if':{'properties':{'success':{'const':True}}},'then':{'properties':{'exit_code':{'const':0}}},'else':{'properties':{'exit_code':{'type':'integer','minimum':1}}}}]}
        # JSON Schema has $defs, while OpenAPI has components. Keep only
        # reachable definitions to avoid shipping the whole HTTP API per operation.
        schema = json.loads(json.dumps(schema).replace('#/components/schemas/', '#/$defs/'))
        needed = set()
        def dependencies(value):
            if isinstance(value, dict):
                reference = value.get('$ref', '')
                if reference.startswith('#/$defs/'):
                    key = reference.split('/')[-1]
                    if key not in needed:
                        needed.add(key); dependencies(schema['$defs'][key])
                for child in value.values(): dependencies(child)
            elif isinstance(value, list):
                for child in value: dependencies(child)
        dependencies(schema['properties'])
        schema['$defs'] = {key:schema['$defs'][key] for key in sorted(needed)}
        write('schemas/'+name.replace('.','-')+'.v1.json',schema)
    # Existing identifiers used by checkpoint and deployment reports are
    # independently published as well as embedded in the deploy envelope.
    legacy = {'verification': components['Verification'], 'staging': components['DeploymentEvent'], 'preservation': components['DeploymentEvent'], 'data-backup': obj({'schema':{'const':'link-assistant-router/data-backup/v1'}, 'signing_secret_sha256': STRING, 'files':{'type':'object','additionalProperties':STRING}, 'excluded':array(STRING)}, ['schema','signing_secret_sha256','files','excluded'])}
    for name, shape in legacy.items():
        shape = copy.deepcopy(shape)
        shape['properties']['schema'] = {'const':f'link-assistant-router/{name}/v1'}
        write('schemas/'+name+'.v1.json', {'$schema':DRAFT, '$id':f'link-assistant-router/{name}/v1', **shape})
    write('schemas/local-deployment.v1.json', {'$schema':DRAFT, '$id':'link-assistant-router/local-deployment/v1', **components['LocalDeployment']})
    matrix=['# Supported operation matrix','','Generated by `scripts/generate-contracts.py`; CI checks catalog, exports and schemas.','', '| Operation | Rust | JS/TS Node/Bun | Python | Schema |','| --- | --- | --- | --- | --- |']
    for op in catalog['operations']:
        matrix.append(f"| `{op['name']}` | `operations::request` | `{re.sub(r'[-_]([a-z])', lambda m:m[1].upper(), op['name'])}` | `{'.'.join((part.replace('-', '_') + ('_' if part in ['with','import'] else '')) for part in op['name'].split('.'))}` | v1 |")
    matrix += ['', 'PHP, Go and Java HTTP clients are generated from the complete OpenAPI document and compiled/probed in CI. Their HTTP methods cover all documented management and model routes; process orchestration is supported by the official Rust, JS/TS and Python packages.','']
    write('docs/integration/operations.md','\n'.join(matrix))
    js=ROOT/'packages/javascript'; py=ROOT/'packages/python/link_assistant_router'
    write('packages/javascript/catalog.json',catalog)
    write('packages/python/link_assistant_router/catalog.json',catalog)
    for path, content in list(outputs.items()):
        if path.startswith('schemas/') and path!='schemas/operation-catalog.v1.json':
            write('packages/javascript/'+path,content); write('packages/python/link_assistant_router/'+path,content)
    return outputs


def main():
    parser=argparse.ArgumentParser(__doc__)
    parser.add_argument('--binary', default=str(ROOT/'target/debug/router'))
    parser.add_argument('--catalog', type=Path)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--version', help='Release version override, before tagging')
    args=parser.parse_args()
    catalog=json.loads(args.catalog.read_text()) if args.catalog else json.loads(subprocess.check_output([args.binary,'contracts'], cwd=ROOT, text=True))
    if args.version: catalog['version']=args.version
    stale=[]
    for path,content in generate(catalog).items():
        target=ROOT/path
        if args.check:
            if not target.exists() or target.read_text()!=content: stale.append(path)
        else:
            target.parent.mkdir(parents=True,exist_ok=True); target.write_text(content)
    if stale: raise SystemExit('Stale contracts: '+', '.join(stale))
    print(f"{'Checked' if args.check else 'Generated'} {len(catalog['operations'])} operations and {len(catalog['routes'])} HTTP routes")

if __name__=='__main__':main()
