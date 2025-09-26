import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET() {
  try {
    console.log('Testing database connection...')

    // Test 1: Check if we can connect to the database at all
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: testError.message,
        step: 'users table test'
      }, { status: 500 })
    }

    // Test 2: Check if customers table exists
    const { data: customersData, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .limit(1)

    if (customersError) {
      return NextResponse.json({
        error: 'Customers table error',
        details: customersError.message,
        step: 'customers table test',
        usersWorking: true
      }, { status: 500 })
    }

    // Test 3: Check table schema
    const { data: schemaData, error: _schemaError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tests: {
        usersTable: testData ? 'OK' : 'Empty',
        customersTable: customersData ? 'OK' : 'Empty',
        customersSchema: schemaData || 'Empty'
      }
    })

  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message,
      step: 'initial connection'
    }, { status: 500 })
  }
}