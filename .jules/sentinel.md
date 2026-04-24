## 2025-02-14 - Prevent Command Injection via execFile
**Vulnerability:** The codebase was using `exec` from `node:child_process` and passing fixed strings as a shell command (`"anchor build"`).
**Learning:** Using `exec` directly exposes the application to command injection if variables/arguments become dynamic. The shell's argument parsing can inadvertently execute user-controlled parameters if they contain shell metacharacters.
**Prevention:** Strictly use `execFile` or `spawn` from `node:child_process` with arguments passed as an array to bypass the shell entirely and avoid interpretation of metacharacters.
