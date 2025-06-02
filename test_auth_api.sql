-- Test authentication context through the API
-- This simulates what happens when requests come through PostgREST

-- First, let's see what the current session looks like
SELECT current_setting('request.jwt.claims', true) as jwt_claims;

-- Check if we can access the auth schema functions
SELECT auth.uid() as auth_uid, auth.role() as auth_role;

-- Test if we can see the current user context when coming through the API
-- Note: This will only work when executed through the REST API with proper headers 