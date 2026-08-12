# PRUDENCE PATH - Project Overview

## App Name
**PRUDENCE PATH**  
*Prudence Powerline Office Accountability & Training System*

## Project Description
A web-based internal accountability, training, and performance tracking system designed to enforce daily discipline, enable structured reporting, and provide hierarchical role-based management for the Prudence Powerline Office organization.

## Core Objectives
- Enforce daily discipline through structured reporting
- Enable daily, weekly, and monthly reporting with trainer verification
- Provide sponsor visibility over downlines
- Support hierarchical roles (Super Admin, Trainer, Sub-Trainer, Pro, Sponsor, Member)
- Deliver clear dashboards and analytics
- Implement modern glassmorphism design system

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Auth, Database, Storage)
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel (recommended)
- **State Management**: React Context + TanStack Query

## Architecture Overview

### Database Schema
- `profiles` - User profile information
- `user_roles` - Role assignments (separate for security)
- `groups` - Team/group management
- `daily_activities` - Daily activity submissions
- `weekly_reports` - Auto-aggregated weekly data
- `monthly_goals` - Monthly goal tracking
- `skills` - Skills Hub content
- `notifications` - User notifications

### Key Features
1. **Authentication & Onboarding**
   - Email/password authentication
   - Unique username system
   - Mandatory sponsor username
   - Pending approval workflow

2. **Daily Activity Reporting**
   - Reading & Learning tracking
   - Gig Creation logging
   - Account Creation tracking
   - Income Tracking (gross/net)
   - Prospecting metrics
   - Skill Acquisition documentation
   - Trainer-only verification fields

3. **Verification System**
   - Trainer/Sub-Trainer verification
   - Section-based approval/rejection
   - Mandatory feedback on rejection
   - Audit trail

4. **Reporting & Analytics**
   - Weekly auto-aggregated reports
   - Monthly goal tracking
   - Consistency scoring
   - Performance dashboards

5. **Team Management**
   - Role-based access control
   - Group assignment
   - Sponsor downline tracking
   - Team member management

6. **Skills Hub**
   - Read-only learning content
   - Theory and practical sections
   - Tools and outcomes

## Design System
- **Glassmorphism UI**: Frosted glass cards, blurred backgrounds, soft gradients
- **Typography**: Inter font family
- **Components**: shadcn/ui component library
- **Responsive**: Mobile-first design approach

## Security
- Row-Level Security (RLS) enabled on all tables
- Role-based access control
- Password hashing via Supabase Auth
- File access restrictions per role/group

## Current Status
See [STATUS.md](./STATUS.md) for detailed implementation status.

