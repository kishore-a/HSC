import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

interface AuthContextType {
  session: Session | null
  user: User | null
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
    })
    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error }
  }

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, signInWithEmail, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}