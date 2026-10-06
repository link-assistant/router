from pathlib import Path
p=Path('src/with_command.rs');s=p.read_text();needle='''        let mut child = tokio::process::Command::from(self.command)''';replacement='''        if let Some(context) = crate::operation_context::current() {
            if let Some(profile) = profile {
                profile.commit_launch(std::process::id())?;
            }
            let output = tokio::task::spawn_blocking(move || {
                context.scope(|| crate::bounded_process::output(&mut self.command, context.process_deadline))
            }).await??;
            crate::operation_output::record(json!({
                "client_exit_code": output.status.code(),
                "stdout": String::from_utf8_lossy(&output.stdout),
                "stderr": String::from_utf8_lossy(&output.stderr)
            }));
            drop(directory);
            return Ok(output.status);
        }
        let mut child = tokio::process::Command::from(self.command)''';assert needle in s;s=s.replace(needle,replacement);p.write_text(s)
p=Path('src/operation_context.rs');s=p.read_text().replace('    pub process_runner: Option<Arc<dyn ProcessRunner>>,','''    pub process_runner: Option<Arc<dyn ProcessRunner>>,
    /// Finite deadline for noninteractive external dependencies.
    pub process_deadline: Duration,''').replace('            process_runner: None,','            process_runner: None,\n            process_deadline: Duration::from_secs(60),');s+='''
/// Apply the scoped environment while preserving command-specific overrides.
pub(crate) fn configure_process(command: &mut Command, context: &OperationContext) {
    let overrides: Vec<_> = command.get_envs().map(|(name,value)| (name.to_owned(),value.map(OsStr::to_owned))).collect();
    command.env_clear().envs(&context.environment);
    for (name,value) in overrides {
        if let Some(value) = value { command.env(name,value); } else { command.env_remove(name); }
    }
    if command.get_current_dir().is_none() { command.current_dir(&context.working_directory); }
}
''';p.write_text(s)
p=Path('src/bounded_process.rs');s=p.read_text().replace('''        if command.get_current_dir().is_none() {
            command.current_dir(&context.working_directory);
        }''','''        crate::operation_context::configure_process(command, &context);''');p.write_text(s)
p=Path('packages/python/link_assistant_router/__init__.py');s=p.read_text().replace('import json\n','import json\nimport keyword\n',1).replace("names = [name.replace('-', '_') for name in operation['name'].split('.')]", "names = [name.replace('-', '_') + ('_' if keyword.iskeyword(name.replace('-', '_')) else '') for name in operation['name'].split('.')]");s=s.replace('deadline: float | None = None, **options: Any)', 'deadline: float | None = None, options: Mapping[str, Any] | None = None, **arguments: Any)');s=s.replace('''        for key, value in options.items():''','''        for key, value in {**(options or {}), **arguments}.items():''');p.write_text(s)
p=Path('scripts/generate-bindings.py');s=p.read_text().replace("if keyword.iskeyword(key):continue", "if keyword.iskeyword(key) or key in ['env','stdin','deadline']:continue");s=s.replace("options += ['env:","options += ['options: Mapping[str, Any] | None = ...','env:");p.write_text(s)
p=Path('src/verification.rs');s=p.read_text().replace('''        "generated_at_unix": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |elapsed| elapsed.as_secs()),''','''        "generated_at_unix": crate::operation_context::now().timestamp(),''');p.write_text(s)
