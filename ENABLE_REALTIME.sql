-- =============================================
-- ENABLE SUPABASE REALTIME FOR WHEEL COLLABORATION
-- =============================================
-- Purpose: Allow team members to see changes in real-time when editing shared wheels
-- Run this in your Supabase SQL Editor AFTER applying FIX_TEAM_WHEEL_DATA_ACCESS.sql
-- 
-- What this does:
-- 1. Enables Realtime broadcasting for wheel-related tables
-- 2. Changes are automatically pushed to all connected clients via WebSocket
-- 3. Respects RLS policies (users only receive updates for wheels they can access)

-- =============================================
-- STEP 1: Enable Realtime on Tables
-- =============================================

-- Add tables to the realtime publication
-- This tells Supabase to broadcast INSERT, UPDATE, and DELETE events

-- Note: These commands will fail if tables are already in the publication
-- If you see "relation is already member of publication" errors, that's good!
-- It means realtime is already enabled. Just skip to STEP 2.

-- Safe way: Drop first if exists (requires DROP privilege)
-- alter publication supabase_realtime drop table if exists public.year_wheels;
-- alter publication supabase_realtime drop table if exists public.wheel_rings;
-- alter publication supabase_realtime drop table if exists public.activity_groups;
-- alter publication supabase_realtime drop table if exists public.labels;
-- alter publication supabase_realtime drop table if exists public.items;

-- Then add them
alter publication supabase_realtime add table public.year_wheels;
alter publication supabase_realtime add table public.wheel_rings;
alter publication supabase_realtime add table public.activity_groups;
alter publication supabase_realtime add table public.labels;
alter publication supabase_realtime add table public.items;

-- =============================================
-- STEP 2: Verify Realtime is Enabled (RUN THIS!)
-- =============================================

-- Check which tables are in the realtime publication
-- You should see all 5 tables listed above
select 
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- ✅ Expected results: You should see at least these tables:
-- - activity_groups
-- - items
-- - labels
-- - wheel_rings
-- - year_wheels

-- =============================================
-- STEP 3: Optional - Enable Realtime for ring_data
-- =============================================

-- Uncomment if you want realtime updates for ring_data table as well
-- (Currently this table exists but may not be actively used)

-- alter publication supabase_realtime add table public.ring_data;

-- =============================================
-- COMPLETED
-- =============================================
-- 
-- After running this migration:
-- 1. All changes to wheel data will be broadcast in real-time
-- 2. The React app (with useRealtimeWheel hook) will receive these updates
-- 3. Multiple team members can collaborate on the same wheel simultaneously
-- 
-- Security: 
-- - RLS policies still apply - users only receive updates for wheels they have access to
-- - No additional permissions needed - Realtime respects existing policies
--
-- Performance:
-- - Each table subscription uses 1 connection per client
-- - Free tier: 200 concurrent connections
-- - Pro tier: 500 concurrent connections
-- - Each wheel uses 4 connections per active user (rings, activity_groups, labels, items)
--
-- Monitoring:
-- - Check Realtime connections in Supabase Dashboard > Database > Realtime Inspector
-- - Monitor performance in Settings > Usage
