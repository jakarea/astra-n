-- Check and create seller users for testing the Assign Product modal
-- Run this SQL to ensure you have seller users in your database

-- First, check current users and their roles
SELECT id, name, email, role, created_at
FROM users
ORDER BY role, name;

-- Check specifically for sellers
SELECT COUNT(*) as seller_count
FROM users
WHERE role = 'seller';

-- If you don't have any sellers, create some test ones
-- Replace the UUIDs and emails with appropriate values

-- Insert test seller users (only if they don't exist)
INSERT INTO users (id, name, email, role, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'John Smith', 'john.smith@example.com', 'seller', NOW(), NOW()),
    (gen_random_uuid(), 'Sarah Johnson', 'sarah.johnson@example.com', 'seller', NOW(), NOW()),
    (gen_random_uuid(), 'Mike Davis', 'mike.davis@example.com', 'seller', NOW(), NOW()),
    (gen_random_uuid(), 'Emma Wilson', 'emma.wilson@example.com', 'seller', NOW(), NOW()),
    (gen_random_uuid(), 'Alex Brown', 'alex.brown@example.com', 'seller', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Verify the sellers were created
SELECT id, name, email, role, created_at
FROM users
WHERE role = 'seller'
ORDER BY name;

-- Optional: Update existing users to be sellers (if needed)
-- Uncomment and modify as needed:
-- UPDATE users SET role = 'seller' WHERE email IN ('user1@example.com', 'user2@example.com');

-- Check the final count
SELECT
    role,
    COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;