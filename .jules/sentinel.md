## 2024-05-24 - Hardcoded Secrets Fallback Mitigation
**Vulnerability:** JWT secrets were falling back to a hardcoded string ('keystone_sovereign_os_2026') across multiple authentication routes.
**Learning:** Hardcoded fallbacks for sensitive environment variables (like `JWT_SECRET`) often exist to prevent breaking local development, static builds, or CI test environments that run without actual secrets.
**Prevention:** To prevent insecure defaults in production while accommodating build environments, apply a pattern that throws an error when the secret is missing, EXCEPT when `process.env.NODE_ENV === 'test'` or `process.env.CI` is true. Ensure dummy fallback values are retained for those specific bypass conditions.
