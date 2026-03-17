## 2024-05-18 - Fix Hardcoded JWT Secret Fallback
**Vulnerability:** The application used a hardcoded fallback string for `JWT_SECRET` if the environment variable was missing. This allows an attacker to forge JWTs and gain unauthorized access if the application is misconfigured.
**Learning:** Hardcoding secrets as fallbacks is a critical vulnerability. The application must explicitly fail to start or operate if required secrets are missing to prevent insecure defaults. Dummy fallbacks should only be allowed in test/CI environments.
**Prevention:** Always check for required environment variables and throw an error if they are missing. Use `process.env.NODE_ENV === 'test'` or `process.env.CI` to allow dummy values in safe environments.
