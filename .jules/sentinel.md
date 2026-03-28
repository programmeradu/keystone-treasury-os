## 2024-05-24 - Unauthenticated Cron Job Found
**Vulnerability:** Found a sensitive cron job (`src/app/api/alerts/cron/route.ts`) executing database operations and sending emails that did not enforce authentication.
**Learning:** Even internal/cron endpoints must have explicit authentication, especially when they access the database or trigger third-party actions, to prevent malicious actors from repeatedly calling them.
**Prevention:** Always follow the project standard to verify the `authorization` header against the `CRON_SECRET` environment variable using a Bearer token scheme for any new automated cron endpoints.
