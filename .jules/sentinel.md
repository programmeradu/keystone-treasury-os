## 2024-05-31 - [Command Injection via child_process.exec]
**Vulnerability:** Found multiple uses of `child_process.exec` in CLI deployment and studio contract compilation where shell commands were concatenated with unvalidated inputs (e.g., `programName` or file paths).
**Learning:** `exec` invokes a shell to interpret the command string, making it vulnerable to shell interpolation and command injection if any variable contains shell metacharacters (like `&&`, `;`, `|`).
**Prevention:** Use `child_process.execFile` or `child_process.spawn` with an array of arguments, which strictly passes arguments to the executable without interpreting them as shell commands.
