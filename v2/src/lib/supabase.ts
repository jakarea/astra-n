import { createClient } from '@supabase/supabase-js'

// Server-side client (for Server Components and API routes)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Client-side client factory function
export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!url,
      anonKey: !!anonKey,
      urlValue: url,
      anonKeyValue: anonKey?.slice(0, 10) + '...'
    })
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, anonKey)
}

// Singleton client instance
let clientInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createSupabaseClient()
  }
  return clientInstance
}