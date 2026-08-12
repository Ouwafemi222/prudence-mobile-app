# PRUDENCE PATH - Implementation Plan

**Created**: January 2, 2026  
**Total Tasks**: 35  
**Estimated Time**: 4-5 weeks

---

## 📋 Phase 1: Core Data Integration (Week 1-2)
**Priority**: HIGH | **Impact**: CRITICAL

### Weekly Reports
1. ✅ Create database function `generate_weekly_report(user_id, week_start_date)`
   - Aggregate: total_pages_read, total_gigs_created, total_accounts_created
   - Aggregate: total_gross_income, total_net_income
   - Aggregate: total_contacts, total_follow_ups
   - Calculate: submission_count, consistency_score
   - Insert/update weekly_reports table

2. ✅ Update `src/pages/WeeklyReports.tsx`
   - Replace mock data with database fetch
   - Fetch current week's report
   - Display real aggregated data
   - Show actual consistency score

3. ✅ Implement reflection save functionality
   - Add form handlers for wins, challenges, lessons_learned, goals_next_week
   - Save to weekly_reports table
   - Show saved reflections

4. ✅ Implement trainer feedback
   - Add trainer feedback input (for trainers only)
   - Save trainer_id and trainer_feedback
   - Display feedback to users

### Monthly Goals
5. ✅ Create database function `calculate_monthly_actuals(user_id, month_year)`
   - Sum daily activities for the month
   - Calculate: actual_pages, actual_gigs, actual_accounts, actual_income, actual_contacts
   - Calculate: consistency_score
   - Update monthly_goals table

6. ✅ Update `src/pages/MonthlyGoals.tsx`
   - Replace mock data with database fetch
   - Fetch current month's goals
   - Display real actuals vs targets
   - Show real consistency score

7. ✅ Implement goal setting UI
   - Add form to set/update monthly targets
   - Save to monthly_goals table
   - Validate goals (must be positive numbers)

8. ✅ Implement monthly consistency calculation
   - Calculate days submitted / total days in month
   - Display consistency percentage
   - Show weekly breakdown

---

## 📋 Phase 2: Database Integration (Week 2-3)
**Priority**: HIGH | **Impact**: HIGH

### Skills Hub
9. ✅ Update `src/pages/SkillsHub.tsx`
   - Replace hardcoded skills with database fetch
   - Fetch from skills table
   - Display skills with proper ordering

10. ✅ Create admin interface for skills CRUD
    - Add admin page or section for skills management
    - Create form: name, overview, theory, practical, tools, outcomes
    - Implement add/edit/delete functionality
    - Set display_order and is_active

11. ✅ Implement user progress tracking
    - Create user_skill_progress table (optional)
    - Track which skills users have completed
    - Display progress in Skills Hub

### Teams Management
12. ✅ Update `src/pages/Teams.tsx`
    - Replace mock data with database fetch
    - Fetch profiles with user_roles
    - Filter by assigned_group_id (if trainer)
    - Show real approval_status

13. ✅ Implement approve/reject functionality
    - Update approval_status to 'approved' or 'rejected'
    - Assign role when approving
    - Send notification to user
    - Refresh list after action

14. ✅ Implement group assignment
    - Add group selector in approve dialog
    - Update assigned_group_id in profiles
    - Show group in member list

15. ✅ Implement trainer assignment
    - Add trainer selector in approve dialog
    - Update assigned_trainer_id in profiles
    - Filter members by trainer

16. ✅ Implement role assignment
    - Add role selector (member, pro, sub_trainer)
    - Update user_roles table
    - Show role badges correctly

---

## 📋 Phase 3: Server-Side Validation & Automation (Week 3-4)
**Priority**: MEDIUM | **Impact**: HIGH

### Submission Lock
17. ✅ Add server-side 10 PM lock enforcement
    - Create database function `is_submission_locked(activity_date)`
    - Check in DailyActivity API/insert
    - Return error if locked
    - Update client to handle error

18. ✅ Implement timezone handling
    - Use server timezone or user timezone preference
    - Store timezone in profiles (optional)
    - Calculate lock time correctly

### Notification Automation
19. ✅ Implement daily reminder notifications
    - Create Supabase Edge Function or cron job
    - Run at 9 PM daily
    - Check users who haven't submitted today
    - Send notification if preference enabled

20. ✅ Implement missed submission alerts
    - Create function to check missing daily activities
    - Run at 11 PM daily
    - Notify users about missed submissions
    - Track consecutive misses

21. ✅ Implement weekly summary notifications
    - Create function to generate weekly summary
    - Run on Sunday night
    - Calculate week's performance
    - Send summary notification

### Auto-Calculations
22. ✅ Implement automatic net income calculation
    - Create function to calculate net from gross
    - Platform-specific fee percentages
    - Update daily_activities on insert/update
    - Or calculate on-the-fly

23. ✅ Create consistency score calculation function
    - Function: `calculate_consistency_score(user_id, period)`
    - Calculate: days_submitted / total_days
    - Return percentage
    - Use in weekly/monthly reports

24. ✅ Create weekly report auto-generation
    - Scheduled job or trigger
    - Run at end of week (Sunday 11:59 PM)
    - Generate reports for all active users
    - Or generate on-demand

25. ✅ Create monthly summary auto-generation
    - Scheduled job or trigger
    - Run at end of month
    - Generate summaries for all active users
    - Calculate all metrics

---

## 📋 Phase 4: Enhanced Features (Week 4-5)
**Priority**: MEDIUM | **Impact**: MEDIUM

### Verification Enhancements
26. ✅ Implement section-based verification
    - Update database schema (add section_verifications table)
    - Or add JSONB column for section status
    - Update Verification page UI
    - Allow verify per section

27. ✅ Add section-level feedback
    - Add feedback field per section
    - Display section feedback separately
    - Show section status in DailyActivity

### Sponsor Dashboard
28. ✅ Calculate downline performance metrics
    - Fetch downline daily activities
    - Calculate: pages, gigs, income for current week
    - Display in downline detail modal
    - Update stats cards

29. ✅ Implement drill-down to reports
    - Add links to view downline reports
    - Show daily/weekly/monthly reports
    - Read-only access for sponsors

30. ✅ Add weekly/monthly summaries
    - Calculate downline summaries
    - Display in sponsor dashboard
    - Show trends over time

### Profile & Preferences
31. ✅ Implement notification preferences save
    - Create user_preferences table (optional)
    - Or add JSONB column to profiles
    - Save notification settings
    - Use in notification automation

32. ✅ Enhance role-based dashboard
    - Show different stats for trainers
    - Show team stats for trainers
    - Show verification queue count
    - Customize quick actions

---

## 📋 Phase 5: Performance & Polish (Week 5)
**Priority**: LOW | **Impact**: MEDIUM

### Performance
33. ✅ Add database indexes
    - Index on user_id in daily_activities
    - Index on activity_date
    - Index on sponsor_username in profiles
    - Index on user_id in weekly_reports, monthly_goals

34. ✅ Optimize queries
    - Add pagination to large lists
    - Limit result sets
    - Optimize joins
    - Use select specific columns

### UX Improvements
35. ✅ Improve error handling
    - Better error messages
    - Retry logic for failed requests
    - Fallback states
    - User-friendly error displays

36. ✅ Add loading states
    - Skeleton loaders
    - Spinner components
    - Progress indicators
    - Smooth transitions

37. ✅ Add empty states
    - No data messages
    - No results illustrations
    - Helpful guidance
    - Call-to-action buttons

---

## 🎯 Implementation Order (Recommended)

### Week 1
- Tasks 1-4: Weekly Reports (Core)
- Tasks 5-8: Monthly Goals (Core)

### Week 2
- Tasks 9-11: Skills Hub
- Tasks 12-16: Teams Management

### Week 3
- Tasks 17-18: Submission Lock
- Tasks 19-21: Notification Automation
- Tasks 22-25: Auto-Calculations

### Week 4
- Tasks 26-27: Verification Enhancements
- Tasks 28-30: Sponsor Dashboard
- Tasks 31-32: Profile & Dashboard

### Week 5
- Tasks 33-34: Performance
- Tasks 35-37: UX Polish

---

## 📝 Notes

### Database Functions Needed
```sql
-- Weekly aggregation
CREATE FUNCTION generate_weekly_report(...)

-- Monthly calculation
CREATE FUNCTION calculate_monthly_actuals(...)

-- Consistency score
CREATE FUNCTION calculate_consistency_score(...)

-- Submission lock check
CREATE FUNCTION is_submission_locked(...)
```

### Scheduled Jobs Needed
- Daily reminders: 9 PM daily
- Missed submissions: 11 PM daily
- Weekly summaries: Sunday 11:59 PM
- Monthly summaries: Last day of month 11:59 PM

### New Tables (Optional)
- `user_skill_progress` - Track skill completion
- `user_preferences` - Store notification preferences
- `section_verifications` - Section-based verification status

---

## ✅ Success Criteria

- [ ] Weekly reports show real aggregated data
- [ ] Monthly goals show real calculations
- [ ] Skills Hub displays database content
- [ ] Teams Management fully functional
- [ ] 10 PM lock enforced server-side
- [ ] Automated notifications working
- [ ] All auto-calculations working
- [ ] Performance optimized
- [ ] UX polished

---

**Total Estimated Time**: 4-5 weeks  
**Priority Order**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

