import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Generates a unique webhook secret
 * Format: wh_[40 character hex string]
 */
export function generateWebhookSecret(): string {
  return 'wh_' + crypto.randomBytes(20).toString('hex')
}

/**
 * Generates a unique webhook secret that doesn't exist in the integrations table
 * Retries up to 5 times if there are collisions
 */
export async function generateUniqueWebhookSecret(): Promise<string> {
  const maxRetries = 5
  let attempts = 0

  while (attempts < maxRetries) {
    const webhookSecret = generateWebhookSecret()

    try {
      // Check if this webhook secret already exists in integrations
        const { data: existingIntegration, error } = await supabaseAdmin
        .from('integrations')
        .select('id')
        .eq('webhook_secret', webhookSecret)
        .maybeSingle()

      if (error) {
        throw error
      }

      // If no existing integration found, this secret is unique
      if (!existingIntegration) {
        return webhookSecret
      }

      attempts++
    } catch (error) {
      throw error
    }
  }

  // If we've exhausted retries, throw an error
  throw new Error('Failed to generate unique webhook secret after maximum retries')
}