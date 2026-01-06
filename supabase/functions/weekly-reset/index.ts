import { createClient } from '@supabase/supabase-js'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Reset weekly claimed credits for all users
  const { error } = await supabase
    .from('users')
    .update({ claimed_credits_this_week: 0 })
    .neq('claimed_credits_this_week', 0) // Only update non-zero

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, reset: 'weekly_claimed_credits' }))
})
