from pathlib import Path
import re
files=['src/clients/types.rs','src/clients/analysis.rs','src/clients/repair.rs','src/credential_status.rs','src/auth_diagnostics.rs','src/emergency_auth.rs','src/metrics.rs','src/login.rs','src/login_api.rs','src/account_limits.rs','src/token_import.rs','src/client_lifecycle/maintenance.rs','src/client_lifecycle/backup.rs','src/auth_import_result.rs']
for name in files:
 p=Path(name)
 if not p.exists():continue
 s=p.read_text()
 def derive(m):
  value=m[1]
  return '#[derive('+value+(', schemars::JsonSchema' if re.search(r'\bSerialize\b',value) and 'JsonSchema' not in value else '')+')]'
 s=re.sub(r'#\[derive\(([^\n]*?)\)\]',derive,s)
 if name.endswith('maintenance.rs'):s=s.replace('struct Plan {','pub(crate) struct Plan {').replace('let status = crate::operation_context::command(&executable)\n                .args(&plan.command[1..])\n                .status();','let status = crate::operation_context::process_output(&mut crate::operation_context::command(&executable).args(&plan.command[1..])).map(|output| output.status);')
 if name.endswith('backup.rs'):s=s.replace('struct Manifest {','pub(crate) struct Manifest {')
 p.write_text(s)
p=Path('src/auth_import.rs');s=p.read_text();s+='''
/// Offline JSON Schema for the credential-safe import report.
pub(crate) fn result_schema() -> schemars::Schema {
    schemars::schema_for!(result::ImportEnvelope<'static>)
}
''';s=s.replace('result::ImportEnvelope', 'self::result::ImportEnvelope');p.write_text(s)
p=Path('src/auth_import_result.rs');s=p.read_text().replace("struct ImportEnvelope<'a>","pub(super) struct ImportEnvelope<'a>");p.write_text(s)
p=Path('src/contracts.rs');s=p.read_text();s=s.replace('        "OperationResult":schemars::schema_for!(crate::operations::OperationResult),','''        "OperationResult":schemars::schema_for!(crate::operations::OperationResult),
        "ClientStatus":schemars::schema_for!(crate::clients::ClientStatus),
        "MaintenancePlan":schemars::schema_for!(crate::client_lifecycle::maintenance::Plan),
        "BackupManifest":schemars::schema_for!(crate::client_lifecycle::backup::Manifest),
        "TokenImportReport":schemars::schema_for!(crate::token_import::ImportReport),
        "AuthImportReport":crate::auth_import::result_schema(),
        "UsageSnapshot":schemars::schema_for!(crate::metrics::UsageSnapshot),
        "CredentialAcceptanceReport":schemars::schema_for!(crate::credential_status::CredentialAcceptanceReport),
        "AuthDiagnosticsSnapshot":schemars::schema_for!(crate::auth_diagnostics::AuthDiagnosticsSnapshot),
        "EmergencyStatus":schemars::schema_for!(crate::emergency_auth::EmergencyStatus),
        "LoginView":schemars::schema_for!(crate::login::LoginView),
        "BeginLoginRequest":schemars::schema_for!(crate::login_api::BeginLoginRequest),
        "SubmitCodeRequest":schemars::schema_for!(crate::login_api::SubmitCodeRequest),''');p.write_text(s)
for name in ['src/managed_server.rs','src/verification.rs','src/deploy_local/staging.rs']:
 p=Path(name);s=p.read_text().replace('Child, Command,','Child,').replace('{Command, ExitCode}','ExitCode');p.write_text(s)
