//! Importable logs read operation.
/// Execute logs read with typed arguments and scoped dependencies.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::LogsOp) -> Result<(), Box<dyn std::error::Error>> {
/// let report = link_assistant_router::logs::read(Default::default(), args).await?;
/// assert!(report.success);
/// # Ok(()) }
/// ```
pub async fn read(
    context: crate::operation_context::OperationContext,
    op: crate::cli::LogsOp,
) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {
    crate::operations::request(context, crate::cli::Command::Logs { op }).await
}
