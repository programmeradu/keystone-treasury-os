## 2024-04-04 - Hardcoded Secrets as Fallback Mechanism

**Vulnerability:** Found multiple instances where the application fell back to a hardcoded string ('keystone_sovereign_os_2026') when the `JWT_SECRET` environment variable was not set.
**Learning:** This architectural gap exists to prevent application crashes during local development or CI where environment variables might not be fully configured, prioritizing developer experience over "fail-fast" security posture in production.
**Prevention:** Rather than using a hardcoded valid secret, production environments must fail fast by throwing an error if cryptographic secrets are missing. To appease CI/CD and static generation builds without sacrificing security, conditional checks for test environments (`process.env.NODE_ENV === 'test'` or `process.env.CI`) should be used to return dummy values intentionally formatted as invalid or strictly for testing (e.g. `dummy_secret_for_testing.XYZ`).
