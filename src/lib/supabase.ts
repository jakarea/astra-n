import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Single Supabase client for all client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export type User = {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    role?: string
  }
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: number
          user_id: string
          name: string
          type: string
          domain: string
          webhook_secret: string
          admin_access_token: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          type: string
          domain: string
          webhook_secret: string
          admin_access_token: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          type?: string
          domain?: string
          webhook_secret?: string
          admin_access_token?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}