// Staff create accounts manually (public sign-up is disabled app-wide).
//
// Creating an auth user needs a sign-up call, but a normal signUp on the main
// client would swap the current staff session to the new user. So we run signUp
// on a throwaway client that never persists its session.
//
// The profile row (created by the handle_new_user trigger) is then filled in
// with that SAME throwaway client — it's authenticated as the brand-new user, so
// the "users update own profile" policy applies. This is what lets a plain admin
// (who has no policy to edit other people's profiles) create student accounts.
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY

// Bare admin usernames (e.g. "capdev8") map to this email domain — matches Login.
export const ADMIN_EMAIL_DOMAIN = 'dar.gov.ph'
export const DEFAULT_PASSWORD = '123456'

const CONFIRM_EMAIL_HINT =
  'Account could not be set up. Turn off "Confirm email" in Supabase → Authentication → Providers → Email, then try again.'

async function createAccount({ email, name, division, position, gender, role, adminStatus }) {
  const tmp = createClient(URL, KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-usercreate-tmp',
    },
  })

  const { data, error } = await tmp.auth.signUp({ email, password: DEFAULT_PASSWORD })
  if (error) return { error }

  const newId = data?.user?.id
  // No session means email confirmation is on — the new user can't finish setup.
  if (!newId || !data?.session) return { error: { message: CONFIRM_EMAIL_HINT } }

  const { error: pErr } = await tmp
    .from('profiles')
    .update({
      name: (name || '').trim(),
      email,
      division,
      position: (position || '').trim(),
      gender: gender || null,
      role,
      admin_status: adminStatus,
      must_reset_password: true,
    })
    .eq('id', newId)
  if (pErr) return { error: pErr }

  return { email }
}

// Admins sign in with a bare username, mapped to <username>@dar.gov.ph.
export async function createAdminUser({ name, username, division, position, gender }) {
  const uname = (username || '').trim()
  const email = uname.includes('@') ? uname : `${uname}@${ADMIN_EMAIL_DOMAIN}`
  return createAccount({ email, name, division, position, gender, role: 'admin', adminStatus: 'approved' })
}

// Co-pilots (customer-service staff) sign in with a bare username like admins.
export async function createCopilotUser({ name, username, division, position, gender }) {
  const uname = (username || '').trim()
  const email = uname.includes('@') ? uname : `${uname}@${ADMIN_EMAIL_DOMAIN}`
  return createAccount({ email, name, division, position, gender, role: 'copilot', adminStatus: 'approved' })
}

// Students (employees) sign in with their email address.
export async function createStudentUser({ name, email, division, position, gender }) {
  return createAccount({
    email: (email || '').trim(),
    name, division, position, gender,
    role: 'employee', adminStatus: 'none',
  })
}
