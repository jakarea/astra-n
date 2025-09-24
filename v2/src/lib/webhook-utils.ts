import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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
 * Generates a unique webhook secret that doesn't exist in the database
 * Retries up to 5 times if there are collisions
 */
export async function generateUniqueWebhookSecret(): Promise<string> {
  const maxRetries = 5
  let attempts = 0

  while (attempts < maxRetries) {
    const webhookSecret = generateWebhookSecret()

    try {
      // Check if this webhook secret already exists
      const { data: existingUser, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('webhook_secret', webhookSecret)
        .maybeSingle()

      if (error) {
        console.error('[WEBHOOK] Error checking webhook secret uniqueness:', error)
        throw error
      }

      // If no existing user found, this secret is unique
      if (!existingUser) {
        console.log('[WEBHOOK] Generated unique webhook secret')
        return webhookSecret
      }

      console.log('[WEBHOOK] Webhook secret collision, retrying...', attempts + 1)
      attempts++
    } catch (error) {
      console.error('[WEBHOOK] Error generating unique webhook secret:', error)
      throw error
    }
  }

  // If we've exhausted retries, throw an error
  throw new Error('Failed to generate unique webhook secret after maximum retries')
}

/**
 * Assigns a webhook secret to a user
 */
export async function assignWebhookSecretToUser(userId: string): Promise<string> {
  try {
    const webhookSecret = await generateUniqueWebhookSecret()

    console.log('[WEBHOOK] Assigning webhook secret to user:', userId)

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ webhook_secret: webhookSecret })
      .eq('id', userId)
      .select('id, name, webhook_secret')
      .single()

    if (error) {
      console.error('[WEBHOOK] Error assigning webhook secret:', error)
      throw error
    }

    console.log('[WEBHOOK] Webhook secret assigned successfully:', data?.name)
    return webhookSecret
  } catch (error) {
    console.error('[WEBHOOK] Failed to assign webhook secret to user:', userId, error)
    throw error
  }
}