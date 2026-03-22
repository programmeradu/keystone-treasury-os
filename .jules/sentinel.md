
## 2024-05-24 - Command Injection via child_process.exec
**Vulnerability:** The application was using `child_process.exec` to run `anchor build`, which is susceptible to command injection if any arguments are dynamically concatenated.
**Learning:** `child_process.exec` spawns a shell to execute the command string, which can lead to command injection if an attacker can manipulate the input string.
**Prevention:** Always use `child_process.execFile` or `child_process.spawn` with an array of arguments, as they avoid shell interpolation and are much safer against command injection.
