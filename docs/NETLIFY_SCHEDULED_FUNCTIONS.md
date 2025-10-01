# Netlify Scheduled Functions Setup for DCA Bots

## ✅ Netlify DOES Support Scheduled Functions!

Netlify has a built-in **Scheduled Functions** feature (in Beta) that works similarly to Vercel Cron.

---

## Key Differences from Vercel

| Feature | Netlify | Vercel |
|---------|---------|--------|
| **Schedule Format** | Cron expression | Cron expression |
| **Configuration** | `netlify.toml` or inline code | `vercel.json` |
| **Execution Limit** | ⚠️ **30 seconds** | ⏱️ 5 minutes (Hobby), 15 min (Pro) |
| **Package Required** | `@netlify/functions` | None |
| **Free Tier** | ✅ Available on all plans | ✅ 100 invocations/day |
| **Testing** | `netlify functions:invoke` | Direct curl |
| **Production Only** | ✅ Yes (no preview deploys) | ✅ Yes |

---

## ⚠️ Critical Limitation: 30 Second Timeout

Netlify scheduled functions have a **hard 30-second execution limit**. This means:

✅ **Can Process**: 5-10 bots per cron run (safe)  
⚠️ **Risk**: More than 10 bots might hit timeout  
❌ **Cannot**: Process 50+ bots in one run  

**Mitigation Strategy:**
- Process max 10 bots per execution
- Use `.limit(10)` in database query
- Remaining bots will be picked up in next run (5 minutes later)

---

## Implementation Done ✅

### 1. Netlify Scheduled Function Created
**File**: `netlify/functions/dca-execute-scheduled.mts`

**Features:**
- Runs every 5 minutes via Netlify scheduler
- Processes max 10 bots per run (stay under 30s limit)
- Direct database connection (no API route overhead)
- Same execution logic as Vercel version
- Full error handling and retry logic

**Schedule**: `*/5 * * * *` (every 5 minutes)

### 2. Configuration Updated
**File**: `netlify.toml`

```toml
[functions]
directory = "netlify/functions"
node_bundler = "esbuild"

[functions."dca-execute-scheduled"]
schedule = "*/5 * * * *"
```

### 3. Dependencies
**Installing**: `@netlify/functions` package

---

## How It Works

```
Every 5 Minutes:
┌─────────────────────────────────────────┐
│ Netlify triggers scheduled function     │
│ netlify/functions/dca-execute-scheduled │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Function receives { next_run } payload  │
│ Connects directly to Turso database     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Query: Find up to 10 bots due to run   │
│ WHERE status='active'                   │
│   AND next_execution <= NOW()           │
│ LIMIT 10                                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Process each bot in parallel:           │
│  1. Get Jupiter quote                   │
│  2. Validate slippage                   │
│  3. Simulate execution                  │
│  4. Record in dca_executions            │
│  5. Update bot stats                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Return summary:                         │
│  - executedCount                        │
│  - failedCount                          │
│  - duration (must be < 30s)             │
│  - nextRun timestamp                    │
└─────────────────────────────────────────┘
```

---

## Testing Locally

```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Start local dev server
netlify dev

# In another terminal, invoke the scheduled function
netlify functions:invoke dca-execute-scheduled --payload '{"next_run":"2025-10-01T12:00:00Z"}'
```

---

## Testing in Production

1. **Deploy the code**:
```bash
git add -A
git commit -m "feat: Add Netlify scheduled function for DCA execution"
git push
```

2. **Wait for deployment** (automatic via Netlify)

3. **Check Netlify UI**:
   - Go to: Functions tab
   - Find: `dca-execute-scheduled`
   - Badge: Should show "Scheduled"
   - Next run: Will display next execution time

4. **View logs**:
   - Click on the function
   - See execution history
   - Check success/failure rates

---

## Environment Variables

Already configured in Netlify (no changes needed):
- ✅ `TURSO_CONNECTION_URL`
- ✅ `TURSO_AUTH_TOKEN`

**No CRON_SECRET needed** - Netlify scheduled functions are automatically authenticated by the platform.

---

## Advantages of Netlify Approach

✅ **No separate API route needed** - Function runs directly  
✅ **Automatic authentication** - No need for CRON_SECRET  
✅ **Built-in UI** - See schedule and logs in Netlify dashboard  
✅ **Free on all plans** - No upgrade required  
✅ **Integrated with deployment** - Automatic updates on git push  

---

## Limitations to Be Aware Of

⚠️ **30 second timeout** - Can't process too many bots  
⚠️ **Production only** - Can't test on preview deploys  
⚠️ **Beta feature** - May have occasional issues  
⚠️ **No streaming** - Can't use response streaming  

---

## Monitoring

After deployment, monitor:

1. **Netlify Dashboard**:
   - Functions → dca-execute-scheduled
   - Check "Next execution" timestamp
   - Review logs for each run

2. **Database**:
```sql
-- Check recent executions
SELECT * FROM dca_executions 
ORDER BY executed_at DESC 
LIMIT 20;

-- Check bot stats
SELECT id, name, execution_count, failed_attempts, status
FROM dca_bots
WHERE status = 'active';
```

3. **Metrics to Track**:
   - Execution duration (should be < 25s)
   - Success rate (should be > 90%)
   - Bots processed per run (should be ~10)
   - Failed attempts (should be low)

---

## Scaling Strategy

**Current (Phase 2A)**: Process 10 bots/5min = **120 bots/hour**

**If you grow beyond 120 active bots:**

**Option 1**: Use Background Functions
- Netlify Background Functions can run up to 15 minutes
- Convert to background function when bot count > 100

**Option 2**: Multiple Scheduled Functions
- Create 5 functions, each handles different bot subset
- `dca-execute-group-1` processes bots 1-10
- `dca-execute-group-2` processes bots 11-20
- etc.

**Option 3**: External Scheduler
- Use Upstash QStash (paid, but very reliable)
- Can handle thousands of bots
- Better for production at scale

---

## Next Steps

1. ✅ **Netlify scheduled function created**
2. ✅ **Configuration updated**
3. ⏳ **Installing @netlify/functions** package
4. ⏳ **Commit and deploy**
5. ⏳ **Verify function appears in Netlify UI**
6. ⏳ **Wait for first execution (5 minutes)**
7. ⏳ **Check logs and database**

---

## Deployment Checklist

- [x] Created scheduled function file
- [x] Updated netlify.toml
- [ ] Installed @netlify/functions
- [ ] Committed changes
- [ ] Pushed to GitHub
- [ ] Verified deployment succeeded
- [ ] Checked function appears in Netlify UI
- [ ] Confirmed next execution time shown
- [ ] Waited for first run
- [ ] Verified logs show success
- [ ] Checked database for execution records

---

## 🚀 Ready to Deploy!

Once `npm install` completes, we'll commit and push. The scheduled function will automatically start running every 5 minutes after deployment!
