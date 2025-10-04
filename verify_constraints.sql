-- Verify seller_products table constraints and relationships
-- Run this after creating the table to ensure everything is properly set up

-- Check if the table exists
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'seller_products' AND table_schema = 'public';

-- Check all constraints on the seller_products table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'seller_products'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Check foreign key relationships specifically
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'seller_products'
ORDER BY tc.constraint_name;

-- Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'seller_products'
ORDER BY indexname;

-- Test constraint integrity (this should fail if constraints are working)
-- Uncomment to test (will show error if constraints work properly):

-- Test 1: Try to insert with non-existent seller_id
-- INSERT INTO seller_products (seller_id, product_id, assigned_by)
-- VALUES ('00000000-0000-0000-0000-000000000000', 1, 'admin-uuid-here');

-- Test 2: Try to insert with non-existent product_id
-- INSERT INTO seller_products (seller_id, product_id, assigned_by)
-- VALUES ('seller-uuid-here', 99999, 'admin-uuid-here');

-- Sample query to check current data (if any)
SELECT
    sp.*,
    u_seller.name as seller_name,
    u_admin.name as assigned_by_name,
    p.name as product_name,
    p.sku as product_sku
FROM seller_products sp
LEFT JOIN users u_seller ON sp.seller_id = u_seller.id
LEFT JOIN users u_admin ON sp.assigned_by = u_admin.id
LEFT JOIN products p ON sp.product_id = p.id
LIMIT 10;