-- Check if RLS is enabled on groups table
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'groups' AND schemaname = 'public';

-- Also check table owner and permissions
SELECT 
  t.table_schema,
  t.table_name,
  t.table_type,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_name = 'groups' AND t.table_schema = 'public'; 