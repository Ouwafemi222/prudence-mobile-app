# Edge Functions for Notification Automation

This document describes the Supabase Edge Functions created for automated notifications in PRUDENCE PATH

## ✅ AUTOMATIC SCHEDULING CONFIGURED

The system is now fully automated using pg_cron! The following schedules are active:

- **Daily Reminders**: 4:30 PM GMT+1 (14:30 UTC) - Daily
- **Missed Submissions**: 11:59 PM GMT+1 (22:59 UTC) - Daily (after daily submission deadline)
- **Weekly Summaries**: 11:59 PM GMT+1 (22:59 UTC) - Every Sunday

**Daily report submission deadline**: 11:59 PM (WAT) each day. Submissions lock at midnight.

Functions use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Edge Function secrets (see `supabase/functions/_shared/supabase-admin.ts`).

## Functions Created

### 1. `daily-reminder-notifications`
**Purpose**: Sends daily reminder notifications at 9 PM to users who haven't submitted their daily activity report yet.

**Logic**:
- Fetches all approved users
- Checks which users have submitted today
- Creates reminder notifications for users who haven't submitted
- Notification type: `reminder`

**Scheduling**: Should be called daily at 9 PM (21:00 UTC or local time)

### 2. `missed-submission-alerts`
**Purpose**: Sends alerts at 11 PM to users who missed submitting yesterday's daily activity report.

**Logic**:
- Fetches all approved users
- Checks which users submitted yesterday
- Calculates consecutive missed days (up to 7 days)
- Creates alert notifications for users who missed
- Notification type: `alert`

**Scheduling**: Should be called daily at 11 PM (23:00 UTC or local time)

### 3. `weekly-summary-notifications`
**Purpose**: Sends weekly performance summary notifications on Sunday night.

**Logic**:
- Fetches all approved users
- For each user, gets or generates their weekly report for last week
- Calculates performance metrics (pages, gigs, accounts, income, consistency)
- Creates summary notifications with personalized messages
- Notification type: `summary`

**Scheduling**: Should be called on Sunday at 11:59 PM (23:59 UTC or local time)

## ✅ Automatic Scheduling (CONFIGURED)

The functions are automatically scheduled using pg_cron extension. The cron jobs are set up in the database migration `setup_notification_cron_jobs`.

### Current Schedule (GMT+1 / Nigeria Time):
- **4:30 PM Daily**: Daily reminder notifications
- **11:59 PM Daily**: Missed submission alerts (runs after submission deadline)
- **11:59 PM Sunday**: Weekly summary notifications

Daily report submission deadline is **11:59 PM** (WAT).

### Manual Scheduling (Alternative - if pg_cron not available)

If pg_cron is not available, you can use an external service to call these functions via HTTP.

### Option 1: Using External Cron Service (Recommended)

1. **Get Function URLs**:
   - Go to Supabase Dashboard → Edge Functions
   - Each function has a public URL like: `https://[project-ref].supabase.co/functions/v1/[function-name]`

2. **Set up Cron Jobs** (using services like cron-job.org, EasyCron, or GitHub Actions):
   - **Daily Reminders**: Schedule HTTP request to `daily-reminder-notifications` at 9 PM daily
   - **Missed Submissions**: Schedule HTTP request to `missed-submission-alerts` at 11 PM daily
   - **Weekly Summaries**: Schedule HTTP request to `weekly-summary-notifications` on Sundays at 11:59 PM

3. **Authentication**:
   - These functions use `SUPABASE_SERVICE_ROLE_KEY` internally (no JWT required)
   - External cron services can call them without authentication
   - Consider adding a secret header for additional security if needed

### Option 2: Using pg_cron Extension (PostgreSQL)

If your Supabase project has `pg_cron` extension enabled:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reminders at 9 PM UTC
SELECT cron.schedule(
  'daily-reminders',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/daily-reminder-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Schedule missed submission alerts at 11 PM UTC
SELECT cron.schedule(
  'missed-submissions',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/missed-submission-alerts',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Schedule weekly summaries on Sundays at 11:59 PM UTC
SELECT cron.schedule(
  'weekly-summaries',
  '59 23 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/weekly-summary-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

**Note**: This requires the `pg_net` extension for HTTP requests from PostgreSQL.

### Option 3: Using GitHub Actions (Free)

Create `.github/workflows/notifications.yml`:

```yaml
name: PRUDENCE PATH Notifications

on:
  schedule:
    # Daily reminders at 9 PM UTC
    - cron: '0 21 * * *'
    # Missed submissions at 11 PM UTC
    - cron: '0 23 * * *'
    # Weekly summaries on Sundays at 11:59 PM UTC
    - cron: '59 23 * * 0'

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          if [ "${{ github.event.schedule }}" == "0 21 * * *" ]; then
            curl -X POST https://[project-ref].supabase.co/functions/v1/daily-reminder-notifications
          elif [ "${{ github.event.schedule }}" == "0 23 * * *" ]; then
            curl -X POST https://[project-ref].supabase.co/functions/v1/missed-submission-alerts
          elif [ "${{ github.event.schedule }}" == "59 23 * * 0" ]; then
            curl -X POST https://[project-ref].supabase.co/functions/v1/weekly-summary-notifications
          fi
```

## Testing Functions

You can manually test these functions by calling them via HTTP:

```bash
# Test daily reminders
curl -X POST https://[project-ref].supabase.co/functions/v1/daily-reminder-notifications

# Test missed submissions
curl -X POST https://[project-ref].supabase.co/functions/v1/missed-submission-alerts

# Test weekly summaries
curl -X POST https://[project-ref].supabase.co/functions/v1/weekly-summary-notifications
```

## Function URLs

To get your function URLs:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on each function to see its URL
4. Replace `[project-ref]` in the examples above with your actual project reference

## Environment Variables

These functions use the following environment variables (automatically provided by Supabase):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Notes

- All functions run in UTC timezone
- Adjust cron schedules if you need different timezones
- Functions are idempotent (safe to call multiple times)
- Check Supabase logs for function execution details
- Monitor notification creation in the `notifications` table

