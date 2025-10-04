-- Debug script to check sellers in database
-- Run this to verify your sellers exist and have the correct role

-- 1. Check all users and their roles
SELECT
    id,
    name,
    email,
    role,
    created_at
FROM users
ORDER BY role, name;

-- 2. Count users by role
SELECT
    role,
    COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- 3. Check specifically for sellers
SELECT
    id,
    name,
    email,
    role
FROM users
WHERE role = 'seller'
ORDER BY name;

-- 4. Check if role field has any unexpected values
SELECT DISTINCT role FROM users;

-- 5. Check for case sensitivity issues
SELECT
    id,
    name,
    email,
    role
FROM users
WHERE LOWER(role) = 'seller'
ORDER BY name;

-- 6. Check if there are any permission issues (RLS policies)
SELECT
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables
WHERE tablename = 'users';

-- 7. If you need to fix role values, uncomment and run:
-- UPDATE users SET role = 'seller' WHERE role = 'Seller' OR role = 'SELLER';

-- 8. If you need to create test sellers, uncomment and run:
-- INSERT INTO users (id, name, email, role, created_at, updated_at)
-- VALUES
--     (gen_random_uuid(), 'Test Seller 1', 'seller1@test.com', 'seller', NOW(), NOW()),
--     (gen_random_uuid(), 'Test Seller 2', 'seller2@test.com', 'seller', NOW(), NOW()),
--     (gen_random_uuid(), 'Test Seller 3', 'seller3@test.com', 'seller', NOW(), NOW())
-- ON CONFLICT (email) DO NOTHING;