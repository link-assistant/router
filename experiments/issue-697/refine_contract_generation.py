from pathlib import Path
p=Path('scripts/generate-contracts.py');s=p.read_text()
s=s.replace("        data = {'anyOf':[OUTPUT, {'type':'array'}, {'type':'object'}]}","        data = OUTPUT")
s=s.replace("        elif name=='usage': data=ref('UsageEnvelope')",'''        elif name=='usage': data=ref('UsageEnvelope')
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
        elif name=='deploy': data={'anyOf':[ref('DeploymentEvent'), OUTPUT]}
''')
s=s.replace("    response_types = {",'''    components.update({
        'OperationCatalog': obj({key:{} for key in ['schema','version','operations','routes','languages','types']}, ['schema','version','operations','routes','languages','types']),
        'Verification': obj({key:{} for key in ['schema','router_version','router_commit','os','arch','prepared_at','generated_at','started_at','finished_at','duration_seconds','areas','client_preparation','require_parity','overall','parity','client_filter','summary']}, ['schema','areas']),
        'Recovery':obj({'recovered':BOOL,'token':STRING,'token_id':STRING,'revoked':array(STRING),'retained_admins':INT,'error':STRING}, ['recovered']),
        'ResetRow':obj({key:{} for key in ['client','profile','status','reason','targets','checked','preserved','backup_id','full','dry_run']}, ['client','profile','status']),
        'RepairReport':obj({key:{} for key in ['dry_run','plans','errors','results','client','changed','backup_id','status','rolled_back','path','state','action','conflicts','files','transaction_id','reason'] }),
        'LogSummary':obj({**{key:INT for key in ['exchanges','records','bytes','streamed','non_streamed','incomplete_streams','unterminated_streams','unverifiable_streams','unparsable_records','undecodable_bodies']},'statuses':{'type':'object','additionalProperties':INT}}),
        'LogAnomaly':obj({'kind':STRING,'detail':STRING,'correlation_ids':array(STRING)}, ['kind','detail','correlation_ids']),
        'DeploymentEvent':obj({key:{} for key in ['schema','namespace','status','root','origin','control_health','serving_health','port_ownership','active_port_owners','catalogs','oauth_ownership','primary_preservation','real_claude_models_and_picker','resource_limits','parity','reason','data_retained','cleanup_scope','mode','previous_checkpoint','oauth_restored','global_atomic_snapshot','data_restore_proven','checkpoint','checkpoint_scope','credential_source','credentials_copied','profiles_projects_sessions','rollback_scope','oauth_copied','blocker','issued_bound_tokens','catalog_comparison','access_loss_explicitly_accepted']}, ['schema']),
    })
    response_types = {''')
s=s.replace("        ('Health','GET'):ref('Health')", "        ('Usage','GET'):ref('UsageSnapshot'), ('CredentialStatus','GET'):obj({'credentials':array(ref('CredentialAcceptanceReport'))}, ['credentials']),\n        ('AuthDiagnostics','GET'):obj({'diagnostics':ref('AuthDiagnosticsSnapshot'),'emergency_auth':ref('EmergencyStatus')}, ['diagnostics','emergency_auth']),\n        ('EmergencyAuthStatus','GET'):ref('EmergencyStatus'), ('EmergencyAuthDisable','POST'):obj({'disabled':BOOL,'was_active':BOOL,'status':ref('EmergencyStatus')}, ['disabled','was_active','status']),\n        ('Login','POST'):ref('LoginView'), ('LoginSession','GET'):ref('LoginView'), ('LoginSession','DELETE'):obj({'cancelled':STRING}, ['cancelled']),\n        ('LoginCode','POST'):ref('LoginView'), ('Providers','POST'):ref('ProviderRecord'),\n        ('Health','GET'):ref('Health')")
s=s.replace("'Tokens':'IssueTokenRequest'", "'Login':'BeginLoginRequest','LoginCode':'SubmitCodeRequest','Tokens':'IssueTokenRequest'")
s=s.replace("    write('openapi/router.yaml',spec)", "    write('openapi/router.yaml',spec)\n    embedded = ['//! Generated offline contracts; regenerate with scripts/generate-contracts.py.', 'pub(super) const CLI_SCHEMAS: &[(&str, &str)] = &[']\n    for operation in catalog['operations'] + [{'name':'cli-error'}]:\n        embedded.append('    ('+json.dumps(operation['name'])+', include_str!(\"../../schemas/'+operation['name'].replace('.', '-')+'.v1.json\")),')\n    embedded += ['];','pub(super) const HTTP: &str = include_str!(\"../../openapi/router.yaml\");','']\n    write('src/contracts/generated.rs', '\\n'.join(embedded))")
s=s.replace("    parser.add_argument('--check', action='store_true')", "    parser.add_argument('--check', action='store_true')\n    parser.add_argument('--version', help='Release version override, before tagging')")
s=s.replace("    stale=[]\n    for path,content in generate(catalog).items():", "    if args.version: catalog['version']=args.version\n    stale=[]\n    for path,content in generate(catalog).items():")
p.write_text(s)
