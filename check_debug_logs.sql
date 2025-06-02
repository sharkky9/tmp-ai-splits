-- Check what was logged in our debug table
SELECT 
  id,
  logged_at,
  auth_uid,
  auth_role,
  created_by_value
FROM public.debug_auth_log
ORDER BY logged_at DESC
LIMIT 10; 