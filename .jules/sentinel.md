## 2024-05-01 - Missing Authentication on Cron Endpoints
**Vulnerability:** Automated cron endpoints (`src/app/api/alerts/cron/route.ts` and `src/app/api/monitors/evaluate/route.ts`) were accessible publicly without any authentication, allowing anyone to trigger expensive operations and emails.
**Learning:** Some cron endpoints lacked the required `CRON_SECRET` validation that was present in others like `src/app/api/cron/dca-execute/route.ts`.
**Prevention:** All automated endpoints must verify that the `Authorization` header matches the `CRON_SECRET` environment variable using a Bearer token scheme.
