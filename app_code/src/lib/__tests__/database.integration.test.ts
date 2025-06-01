import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Profile, Group, GroupMember } from '@/types/database' // Using our defined types

// Ensure environment variables are loaded (Jest might need dotenv for this if not run via Next.js context)
// For simplicity, we assume they are available in the test environment.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const supabaseServiceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL or Anon Key is not defined. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local or test environment.'
  )
}

// Create ONLY ONE Supabase client instance to avoid GoTrueClient conflicts
// Use service role key for all operations to bypass RLS
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

// --- Test Data ---
let testUser: Profile
let testUser2: Profile
let testGroup: Group

// Helper function to create a profile (simulating auth.users and public.profiles)
async function createTestProfile(email: string, fullName: string): Promise<Profile> {
  // Test if we can even read from profiles table first
  const { data: existingCount, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .limit(1)

  console.log('Profiles table read test:', { count: existingCount?.length, error: countError })

  if (countError && countError.message.includes('Invalid API key')) {
    throw new Error('Service role authentication failed: ' + countError.message)
  }

  // For local testing, we'll directly create a profile record without going through auth signup
  // This bypasses the email validation issues in local Supabase environment
  const testId = crypto.randomUUID() // Generate a proper UUID

  console.log('Attempting to create profile with ID:', testId)

  // Create the profile directly in the database using service role permissions
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: testId, // Use a proper UUID for testing
      email: email,
      name: fullName, // Map fullName to the Profile.name field
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (profileError) {
    console.error('Profile creation error for', email, profileError)
    console.error('Profile creation details:', {
      id: testId,
      email,
      name: fullName,
      serviceRoleKeyPrefix: supabaseServiceRoleKey.substring(0, 20) + '...',
    })
    throw profileError
  }

  console.log('Successfully created profile:', profile)
  return profile as Profile
}

// --- Test Suite ---
describe('Database Integration Tests', () => {
  // Setup: Create test users before all tests
  beforeAll(async () => {
    try {
      testUser = await createTestProfile('testuser1@example.com', 'Test User One')
      testUser2 = await createTestProfile('testuser2@example.com', 'Test User Two')
    } catch (error) {
      console.error('Failed to create test users:', error)
      throw error // Fail all tests if setup fails
    }
  })

  // Teardown: Clean up test data after all tests
  afterAll(async () => {
    if (testGroup) {
      await supabase.from('group_members').delete().eq('group_id', testGroup.id)
      await supabase.from('groups').delete().eq('id', testGroup.id)
    }
    if (testUser) {
      // Supabase doesn't allow direct user deletion from client without service_role.
      // We rely on the fact that local Supabase can be reset.
      // For CI/CD, a proper cleanup or service_role key would be needed.
      // await supabase.auth.admin.deleteUser(testUser.id) // Requires admin privileges
      await supabase.from('profiles').delete().eq('id', testUser.id)
    }
    if (testUser2) {
      await supabase.from('profiles').delete().eq('id', testUser2.id)
    }
  })

  describe('Groups Table CRUD', () => {
    it('should create a new group', async () => {
      const groupName = `Test Group ${Date.now()}`
      const { data, error } = await supabase
        .from('groups')
        .insert({ name: groupName, created_by: testUser.id })
        .select()
        .single<Group>()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.name).toBe(groupName)
      expect(data?.created_by).toBe(testUser.id)
      testGroup = data as Group // Save for later tests
    })

    it('should read a group', async () => {
      expect(testGroup).toBeDefined() // Depends on previous test
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', testGroup.id)
        .single<Group>()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.id).toBe(testGroup.id)
      expect(data?.name).toBe(testGroup.name)
    })

    it('should update a group', async () => {
      expect(testGroup).toBeDefined()
      const newDescription = 'Updated group description'
      const { data, error } = await supabase
        .from('groups')
        .update({ description: newDescription })
        .eq('id', testGroup.id)
        .select()
        .single<Group>()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.description).toBe(newDescription)
      testGroup = data as Group // Update stored group
    })

    // Delete test is part of afterAll cleanup to ensure other tests can run
  })

  describe('Group Members Table Operations', () => {
    let createdMember: GroupMember

    it('should add a regular member to a group', async () => {
      expect(testGroup).toBeDefined()
      expect(testUser).toBeDefined()

      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: testGroup.id,
          user_id: testUser.id,
          is_placeholder: false,
          role: 'admin',
        })
        .select()
        .single<GroupMember>()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.group_id).toBe(testGroup.id)
      expect(data?.user_id).toBe(testUser.id)
      expect(data?.is_placeholder).toBe(false)
      expect(data?.role).toBe('admin')
      createdMember = data as GroupMember
    })

    it('should add a placeholder member to a group', async () => {
      expect(testGroup).toBeDefined()
      const placeholderName = 'Placeholder Member1'
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: testGroup.id,
          placeholder_name: placeholderName,
          email: 'placeholder1@example.com',
          is_placeholder: true,
          role: 'member',
        })
        .select()
        .single<GroupMember>()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.group_id).toBe(testGroup.id)
      expect(data?.user_id).toBeNull()
      expect(data?.placeholder_name).toBe(placeholderName)
      expect(data?.is_placeholder).toBe(true)
    })

    it('should prevent adding a member if user_id and placeholder_name are both null (check_user_or_placeholder constraint)', async () => {
      expect(testGroup).toBeDefined()
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: testGroup.id, is_placeholder: false }) // Both user_id and placeholder_name are null

      expect(error).toBeDefined()
      expect(error?.message).toContain('check_user_or_placeholder')
    })

    it('should prevent adding a duplicate real user to the same group (unique_group_user constraint)', async () => {
      expect(createdMember).toBeDefined() // Relies on the first member test
      const { error } = await supabase.from('group_members').insert({
        group_id: createdMember.group_id,
        user_id: createdMember.user_id, // Same user and group
        is_placeholder: false,
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('unique_group_user_placeholder')
    })

    it('should prevent adding a duplicate placeholder name to the same group (unique_group_placeholder_name constraint)', async () => {
      expect(testGroup).toBeDefined()
      const placeholderName = 'Placeholder Member2' // New unique name first
      await supabase.from('group_members').insert({
        group_id: testGroup.id,
        placeholder_name: placeholderName,
        is_placeholder: true,
      })

      const { error } = await supabase // Attempt to insert duplicate
        .from('group_members')
        .insert({
          group_id: testGroup.id,
          placeholder_name: placeholderName,
          is_placeholder: true,
        })

      expect(error).toBeDefined()
      expect(error?.message).toContain('unique_group_user_placeholder')
    })
  })

  describe('SQL Helper Function Tests (is_group_member, is_group_admin)', () => {
    // let memberForFuncTest: GroupMember;
    let placeholderForFuncTest: GroupMember

    beforeAll(async () => {
      // Ensure testGroup exists
      if (!testGroup) {
        // If CRUD tests didn't run or set it up
        const groupName = `Func Test Group ${Date.now()}`
        const { data } = await supabase
          .from('groups')
          .insert({ name: groupName, created_by: testUser.id })
          .select()
          .single<Group>()
        testGroup = data as Group
      }
      // Add a real member and a placeholder for these tests
      /* const { data: realMemberData } = */ await supabase
        .from('group_members')
        .insert({
          group_id: testGroup.id,
          user_id: testUser.id,
          is_placeholder: false,
          role: 'admin',
        })
        .select()
        .single<GroupMember>()
      // memberForFuncTest = realMemberData as GroupMember; // Intentionally commented out as it was unused

      const { data: placeholderData } = await supabase
        .from('group_members')
        .insert({
          group_id: testGroup.id,
          placeholder_name: 'FuncPlaceholder',
          is_placeholder: true,
          role: 'member',
        })
        .select()
        .single<GroupMember>()
      placeholderForFuncTest = placeholderData as GroupMember
    })

    it('is_group_member should return true for an actual member', async () => {
      const { data, error } = await supabase.rpc('is_group_member', {
        p_group_id: testGroup.id,
        p_user_id: testUser.id,
      })
      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it('is_group_member should return false for a non-member', async () => {
      const { data, error } = await supabase.rpc('is_group_member', {
        p_group_id: testGroup.id,
        p_user_id: testUser2.id,
      }) // testUser2 is not in this group
      expect(error).toBeNull()
      expect(data).toBe(false)
    })

    it('is_group_member should return false for a placeholder when checking against user_id', async () => {
      // is_group_member specifically checks if a *user_id* is a non-placeholder member.
      // If we passed placeholderForFuncTest.user_id (which is null), it would be false by definition.
      // This test confirms it doesn't mistakenly identify a placeholder as a real user if a user_id somehow matched a placeholder's email user (not the case here).
      const { data, error } = await supabase.rpc('is_group_member', {
        p_group_id: placeholderForFuncTest.group_id,
        p_user_id: '00000000-0000-0000-0000-000000000000',
      }) // A dummy UUID unlikely to exist
      expect(error).toBeNull()
      expect(data).toBe(false)
    })

    it('is_group_admin should return true for an admin member', async () => {
      const { data, error } = await supabase.rpc('is_group_admin', {
        p_group_id: testGroup.id,
        p_user_id: testUser.id,
      })
      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it('is_group_admin should return false for a non-admin member', async () => {
      // First, add testUser2 as a non-admin member for this specific test
      await supabase.from('group_members').insert({
        group_id: testGroup.id,
        user_id: testUser2.id,
        is_placeholder: false,
        role: 'member',
      })
      const { data, error } = await supabase.rpc('is_group_admin', {
        p_group_id: testGroup.id,
        p_user_id: testUser2.id,
      })
      expect(error).toBeNull()
      expect(data).toBe(false)
      // Clean up the member added for this test
      await supabase
        .from('group_members')
        .delete()
        .match({ group_id: testGroup.id, user_id: testUser2.id })
    })

    it('is_group_admin should return false for a placeholder member (even if role was admin)', async () => {
      // Update placeholder to have admin role temporarily for this test case
      await supabase
        .from('group_members')
        .update({ role: 'admin' })
        .eq('id', placeholderForFuncTest.id)
      const { data, error } = await supabase.rpc('is_group_admin', {
        p_group_id: placeholderForFuncTest.group_id,
        p_user_id: placeholderForFuncTest.user_id,
      }) // user_id is null
      expect(error).toBeNull()
      // This should be false because is_group_admin checks for non-placeholder members.
      // If it were to check a placeholder by some other means, this test might need adjustment.
      expect(data).toBe(false)
      // Revert role
      await supabase
        .from('group_members')
        .update({ role: 'member' })
        .eq('id', placeholderForFuncTest.id)
    })
  })
})
