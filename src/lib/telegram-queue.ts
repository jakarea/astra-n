import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TelegramJob {
  id?: number
  userId: string
  orderId: number
  orderData: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  createdAt?: string
  updatedAt?: string
  error?: string
}

export class TelegramQueue {
  private static instance: TelegramQueue
  private isProcessing = false

  static getInstance(): TelegramQueue {
    if (!TelegramQueue.instance) {
      TelegramQueue.instance = new TelegramQueue()
    }
    return TelegramQueue.instance
  }

  /**
   * Add a Telegram notification job to the queue
   */
  async addJob(job: Omit<TelegramJob, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('telegram_jobs')
        .insert({
          user_id: job.userId,
          order_id: job.orderId,
          order_data: job.orderData,
          status: 'pending',
          attempts: 0,
          max_attempts: job.maxAttempts || 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Failed to add Telegram job to queue:', error)
        throw error
      }

      console.log('✅ Telegram job added to queue:', {
        userId: job.userId,
        orderId: job.orderId,
        status: 'pending'
      })

      // Trigger background processing
      this.processQueue()
    } catch (error) {
      console.error('❌ Error adding Telegram job:', error)
      throw error
    }
  }

  /**
   * Process pending jobs in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Queue processing already in progress, skipping...')
      return
    }

    this.isProcessing = true
    console.log('🚀 Starting Telegram queue processing...')

    try {
      // Get pending jobs
      const { data: jobs, error } = await supabaseAdmin
        .from('telegram_jobs')
        .select('*')
        .eq('status', 'pending')
        .lt('attempts', supabaseAdmin.from('telegram_jobs').select('max_attempts'))
        .order('created_at', { ascending: true })
        .limit(10)

      if (error) {
        console.error('❌ Failed to fetch pending jobs:', error)
        return
      }

      if (!jobs || jobs.length === 0) {
        console.log('✅ No pending Telegram jobs found')
        return
      }

      console.log(`📋 Found ${jobs.length} pending Telegram jobs`)

      // Process each job
      for (const job of jobs) {
        await this.processJob(job)
      }

    } catch (error) {
      console.error('❌ Error processing Telegram queue:', error)
    } finally {
      this.isProcessing = false
      console.log('✅ Telegram queue processing completed')
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: TelegramJob): Promise<void> {
    console.log(`🔄 Processing Telegram job ${job.id} for user ${job.userId}`)

    try {
      // Mark job as processing
      await this.updateJobStatus(job.id!, 'processing')

      // Import Telegram function dynamically to avoid circular imports
      const { sendOrderNotification } = await import('./telegram')
      
      // Send the notification
      const result = await sendOrderNotification(job.userId, job.orderData)

      if (result.success) {
        // Mark job as completed
        await this.updateJobStatus(job.id!, 'completed')
        console.log(`✅ Telegram job ${job.id} completed successfully`)
      } else {
        // Mark job as failed and increment attempts
        await this.updateJobStatus(job.id!, 'failed', result.error)
        console.error(`❌ Telegram job ${job.id} failed:`, result.error)
      }

    } catch (error: any) {
      console.error(`❌ Error processing Telegram job ${job.id}:`, error)
      
      // Increment attempts and mark as failed if max attempts reached
      const newAttempts = job.attempts + 1
      const status = newAttempts >= job.maxAttempts ? 'failed' : 'pending'
      
      await this.updateJobStatus(job.id!, status, error.message, newAttempts)
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: number, 
    status: TelegramJob['status'], 
    error?: string, 
    attempts?: number
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (error) {
      updateData.error = error
    }

    if (attempts !== undefined) {
      updateData.attempts = attempts
    }

    const { error: updateError } = await supabaseAdmin
      .from('telegram_jobs')
      .update(updateData)
      .eq('id', jobId)

    if (updateError) {
      console.error('❌ Failed to update job status:', updateError)
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    const { data, error } = await supabaseAdmin
      .from('telegram_jobs')
      .select('status')
      .in('status', ['pending', 'processing', 'completed', 'failed'])

    if (error) {
      console.error('❌ Failed to get queue stats:', error)
      return { pending: 0, processing: 0, completed: 0, failed: 0 }
    }

    const stats = data.reduce((acc, job) => {
      acc[job.status as keyof typeof acc]++
      return acc
    }, { pending: 0, processing: 0, completed: 0, failed: 0 })

    return stats
  }
}

// Export singleton instance
export const telegramQueue = TelegramQueue.getInstance()
