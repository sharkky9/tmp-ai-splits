import { notFound } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface GroupPageProps {
  params: {
    groupId: string;
  };
}

// Define a more specific type for what we expect from Supabase
interface Profile {
  id: string;
  name: string | null;
  email: string | null;
}

interface GroupMember {
  role: string | null;
  profiles: Profile | null; 
}

interface Group {
  id: string;
  name: string | null;
  description: string | null;
  created_at: string;
  profiles: Profile | null; // Creator's profile
}

interface GroupDetails extends Group {
  members: GroupMember[];
}

async function getGroupDetails(groupId: string): Promise<GroupDetails | null> {
  const cookieStore = cookies(); // This is ReadonlyRequestCookies

  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Typescript needs to know that cookieStore is not just Readonly
          // For RSC that only READS cookies, this might not even be called.
          // However, to satisfy the interface, we provide it.
          // The `cookies()` from `next/headers` in RSC is read-only.
          // For actual set/remove, you'd typically do this in Server Actions or Route Handlers.
          // This is a common point of confusion with @supabase/ssr in RSCs.
          // For now, let's try to make types happy. If set/remove is called here, it would error at runtime.
          try {
            (cookieStore as any).set(name, value, options); 
          } catch (error) {
            // In a real app, you might log this or handle it if set is unexpectedly called in RSC
            // console.log("Cookie set operation called in RSC context", name, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            (cookieStore as any).set(name, '', options); // Use set with empty value for remove
          } catch (error) {
            // console.log("Cookie remove operation called in RSC context", name, error);
          }
        },
      },
    }
  );

  // Fetch the group and its creator's profile
  const { data: groupData, error: groupError } = await supabaseServer
    .from('groups')
    .select(`
      id, name, description, created_at,
      profiles (id, name, email)
    `)
    .eq('id', groupId)
    .single(); // .single() should ensure 'profiles' is an object if found

  if (groupError) {
    console.error('Error fetching group:', groupError.message);
    return null;
  }
  if (!groupData) { // Explicitly check if groupData is null after .single()
    console.error('Group not found.');
    return null;
  }

  // Fetch members and their profiles
  const { data: membersData, error: membersError } = await supabaseServer
    .from('group_members')
    .select(`
      role,
      profiles (id, name, email)
    `)
    .eq('group_id', groupId);

  if (membersError) {
    console.error('Error fetching group members:', membersError.message);
    // Return group data even if members fetch fails, with empty members array
  }
  
  // Type assertion based on expected structure from Supabase queries
  // Supabase types can be broad, so explicit casting helps ensure our component types are met.
  const creatorProfile = groupData.profiles as Profile | null;
  
  const members = (membersData || []).map(member => ({
    role: member.role as string | null,
    profiles: member.profiles as Profile | null
  })) as GroupMember[];

  const groupDetails: GroupDetails = {
    id: groupData.id,
    name: groupData.name,
    description: groupData.description,
    created_at: groupData.created_at,
    profiles: creatorProfile, // Assign the correctly typed creator profile
    members: members,
  };

  return groupDetails;
}

export default async function GroupDetailPage({ params }: GroupPageProps) {
  const groupDetails = await getGroupDetails(params.groupId);

  if (!groupDetails) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">{groupDetails.name}</h1>
        <p className="text-gray-600 mb-4">{groupDetails.description || 'No description provided.'}</p>
        <div className="mb-4">
          <span className="font-semibold">Created by:</span> 
          {groupDetails.profiles?.name || 'N/A'} 
          ({groupDetails.profiles?.email || 'N/A'})
        </div>
        <div className="mb-4">
          <span className="font-semibold">Created on:</span> {new Date(groupDetails.created_at).toLocaleDateString()}
        </div>
        
        <h2 className="text-2xl font-semibold mt-6 mb-3">Members</h2>
        {groupDetails.members && groupDetails.members.length > 0 ? (
          <ul className="space-y-2">
            {groupDetails.members.map((member) => (
              member.profiles && (
                <li key={member.profiles.id} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                  <div>
                    <span className="font-medium">{member.profiles.name || 'Unknown Name'}</span> 
                    ({member.profiles.email || 'Unknown Email'})
                  </div>
                  <span className="text-sm text-gray-500 capitalize">{member.role || 'N/A'}</span>
                </li>
              )
            ))}
          </ul>
        ) : (
          <p>No members yet.</p>
        )}
      </div>
      {/* Further UI for expenses, inviting members, etc. will go here */}
    </div>
  );
}

// Revalidate data at most every 60 seconds, or on demand
export const revalidate = 60; 