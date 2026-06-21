import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const UserContext = createContext(null)

// Columns in the `profiles` table that the app is allowed to edit.
const EDITABLE_COLS = ['name', 'email', 'division', 'position']

export function UserProvider({ children }) {
  const { session } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    let active = true

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!active) return
        setUser({
          id: session.user.id,
          name: data?.name || '',
          email: data?.email || session.user.email || '',
          division: data?.division || '',
          position: data?.position || '',
          joined: data?.joined || '',
        })
        setLoading(false)
      })

    return () => { active = false }
  }, [session])

  const updateUser = async patch => {
    // Optimistic local update so the UI feels instant.
    setUser(prev => ({ ...prev, ...patch }))

    // Persist only the editable columns that were actually provided.
    const dbPatch = {}
    for (const key of EDITABLE_COLS) {
      if (key in patch) dbPatch[key] = patch[key]
    }
    if (session && Object.keys(dbPatch).length) {
      const { error } = await supabase
        .from('profiles')
        .update(dbPatch)
        .eq('id', session.user.id)
      if (error) console.error('Failed to save profile:', error.message)
    }
  }

  // A profile that exists but has no name still needs onboarding.
  const needsOnboarding = !!user && !user.name

  return (
    <UserContext.Provider value={{ user, loading, needsOnboarding, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)

export const initials = name =>
  (name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
