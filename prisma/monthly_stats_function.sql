-- Create a function to get monthly order statistics
-- This can be executed in your Supabase SQL editor or through migrations

CREATE OR REPLACE FUNCTION get_monthly_order_stats()
RETURNS TABLE (
  month text,
  orders bigint,
  revenue numeric
)
LANGUAGE sql
AS $$
  SELECT
    TO_CHAR(order_created_at, 'Mon') as month,
    COUNT(*) as orders,
    SUM(total_amount) as revenue
  FROM orders
  WHERE order_created_at >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY DATE_TRUNC('month', order_created_at), TO_CHAR(order_created_at, 'Mon')
  ORDER BY DATE_TRUNC('month', order_created_at);
$$;