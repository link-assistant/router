"""Replace process-only deployment settings with per-operation settings."""
from pathlib import Path
p=Path('src/operation_context.rs');s=p.read_text();s=s.replace('    pub(crate) output: Arc<Mutex<CapturedOutput>>,','    pub(crate) output: Arc<Mutex<CapturedOutput>>,\n    pub(crate) deployment_instance: Arc<Mutex<Option<String>>>,\n    pub(crate) deployment_settings: Arc<Mutex<crate::deploy_local::runtime_env::LocalSettings>>,');s=s.replace('            output: Arc::new(Mutex::new(CapturedOutput::default())),','            output: Arc::new(Mutex::new(CapturedOutput::default())),\n            deployment_instance: Default::default(),\n            deployment_settings: Default::default(),');p.write_text(s)
p=Path('src/deploy/instance.rs');s=p.read_text();s=s.replace('//! The instance is chosen once per process, before the first name is read:\n//! a deployment command manages exactly one instance.','//! Library operations select an instance within their operation context. Native\n//! CLI commands keep the historical once-per-process selection.');s=s.replace('    let selected = INSTANCE.get_or_init(|| name.to_string());','    if let Some(context) = crate::operation_context::current() {\n        *context.deployment_instance.lock().expect("deployment instance lock") = Some(name.into());\n        return Ok(());\n    }\n    let selected = INSTANCE.get_or_init(|| name.to_string());');s=s.replace('/// The historical name with the instance suffix, when one is selected.','''/// Owned selection from the current operation, or the native CLI selection.
#[must_use]
pub fn selected_name() -> Option<String> {
    crate::operation_context::current().map_or_else(
        || selected().map(str::to_owned),
        |context| context.deployment_instance.lock().expect("deployment instance lock").clone(),
    )
}

/// The historical name with the instance suffix, when one is selected.''');s=s.replace('    selected().map_or_else(', '    selected_name().map_or_else(');s=s.replace('    /// The resolved name.','''    /// Name resolved within the active operation; never cached process-wide.
    #[must_use]
    pub fn value(&self) -> String {
        format!("{}{}", qualify(self.base), self.trailer)
    }

    /// The resolved name for native CLI callers.''');s=s.replace('formatter.write_str(self.as_str())','formatter.write_str(&self.value())').replace('fmt::Debug::fmt(self.as_str(), formatter)','fmt::Debug::fmt(&self.value(), formatter)');p.write_text(s)
p=Path('src/deploy_local/runtime_env.rs');s=p.read_text();s=s.replace('//! The settings are chosen once per process by `deploy_cli`, before the\n//! coordinator runs; a deployment command manages one deployment.','//! Library settings belong to the operation context. Native CLI settings are\n//! selected once by `deploy_cli`, before the coordinator runs.');a=s.index('pub fn configure(');b=s.index('/// The fingerprint',a);s=s[:a]+'''pub fn configure(settings: LocalSettings) {
    if let Some(context) = crate::operation_context::current() {
        *context.deployment_settings.lock().expect("deployment settings lock") = settings;
    } else {
        let _ = SETTINGS.set(settings);
    }
}

pub(super) fn current() -> LocalSettings {
    crate::operation_context::current().map_or_else(
        || SETTINGS.get().cloned().unwrap_or_default(),
        |context| context.deployment_settings.lock().expect("deployment settings lock").clone(),
    )
}

'''+s[b:];p.write_text(s)
p=Path('src/deploy_local/docker.rs');s=p.read_text().replace('insert(&mut arguments, runtime,','insert(&mut arguments, &runtime,').replace('environment(runtime,','environment(&runtime,');p.write_text(s)
p=Path('src/deploy_cli.rs');s=p.read_text().replace('instance::selected().map(str::to_string)','instance::selected_name()');p.write_text(s)
# Preserve the public Deref/as_str API for old native callers; internal operational
# code must resolve names for its context each time instead of using that cache.
for p in [Path('src/deploy_local.rs'),*Path('src/deploy_local').glob('*.rs')]:
    if 'tests' in p.name: continue
    s=p.read_text().replace('&*RELAY', '&RELAY.value()').replace('&RELAY,','&RELAY.value(),').replace('&RELAY)', '&RELAY.value())')
    s=s.replace('            Existing::Managed(active) if active.port == self.port => Some(&RELAY.value()),','            Existing::Managed(active) if active.port == self.port => Some(relay.as_str()),')
    if p.name=='deploy_local.rs':s=s.replace('        let allowed_holder = match existing {', '        let relay = RELAY.value();\n        let allowed_holder = match existing {')
    p.write_text(s)
p=Path('src/operations.rs');s=p.read_text();s=s.replace('pub async fn run_arguments(mut arguments: Vec<OsString>) -> ExitCode {','pub async fn run_arguments(arguments: Vec<OsString>) -> ExitCode {\n    let mut arguments = crate::cli::protect_client_arguments(arguments, true);');s=s.replace('    let result = result(operation, code, captured);','''    let mut result = result(operation, code, captured);
    if let Err(error) = crate::contracts::validation::operation(
        &result.operation, &serde_json::to_value(&result).expect("operation result"),
    ) {
        result.diagnostics.push(format!("operation contract violation: {error}"));
        result.data = serde_json::json!({"output": []});
        result.success = false;
        result.exit_code = 1;
    }''');p.write_text(s)
p=Path('src/bin/with-router.rs');s=p.read_text();s=s.replace('    let args = <Args as lino_arguments::Parser>::parse_from(arguments);','''    let boundary = arguments.iter().position(|argument| argument == "--").unwrap_or(arguments.len());
    if arguments[..boundary].iter().any(|argument| argument == "--json") {
        let nested = std::iter::once("router".into()).chain(std::iter::once("with".into()))
            .chain(arguments.into_iter().skip(1)).collect();
        return link_assistant_router::operations::run_arguments(nested).await;
    }
    let args = <Args as lino_arguments::Parser>::parse_from(arguments);''');p.write_text(s)
p=Path('src/deploy/operations.rs');s=p.read_text().replace('            let image = args','            let root = if root.is_absolute() { root } else { context.working_directory.join(root) };\n            let image = args');p.write_text(s)
