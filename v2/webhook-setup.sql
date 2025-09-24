-- =====================================================
-- Webhook Setup SQL Script
-- This script adds webhook_secret column to users table
-- and assigns unique webhook secrets to all users
-- =====================================================

-- Step 1: Add webhook_secret column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR UNIQUE;

-- Step 2: Create index for faster webhook secret lookups
CREATE INDEX IF NOT EXISTS idx_users_webhook_secret ON users(webhook_secret);

-- Step 3: Update users with their unique webhook secrets
-- User: System Test User (ID: 00000000-0000-0000-0000-000000000000)
UPDATE users
SET webhook_secret = 'wh_5503905bb1b8febad863cdc7c317ee605c8de74e'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- User: jakareaparvez (ID: a8a378d8-dc7d-4b3c-b97d-2f673c1f4ec6)
UPDATE users
SET webhook_secret = 'wh_3bfd86a47a510cdace0b5ad2c0e6d2b1d666b455'
WHERE id = 'a8a378d8-dc7d-4b3c-b97d-2f673c1f4ec6';

-- Step 4: Verify the updates (optional - you can run this to check)
-- SELECT id, name, webhook_secret FROM users WHERE webhook_secret IS NOT NULL;

-- =====================================================
-- Webhook Secrets Reference:
-- =====================================================
-- System Test User: wh_5503905bb1b8febad863cdc7c317ee605c8de74e
-- jakareaparvez:     wh_3bfd86a47a510cdace0b5ad2c0e6d2b1d666b455
-- =====================================================

-- =====================================================
-- Usage Instructions:
-- =====================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Use webhook endpoint: POST http://localhost:3005/api/webhook/lead
-- 3. Add header: X-Webhook-Secret: [your-webhook-secret]
-- 4. Send JSON body with lead data (source field required)
--
-- Example Header:
-- X-Webhook-Secret: wh_3bfd86a47a510cdace0b5ad2c0e6d2b1d666b455
--
-- Example Body:
-- {
--   "name": "Test Lead",
--   "email": "test@example.com",
--   "source": "website",
--   "kpi_status": "new"
-- }
-- =====================================================