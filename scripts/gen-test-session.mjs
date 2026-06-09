import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://oaigxafbggjecombncja.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haWd4YWZiZ2dqZWNvbWJuY2phIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQwNzkwOCwiZXhwIjoyMDk1OTgzOTA4fQ.t-MsavVbhPKM5PLalHLChPrtC3CmbBdGe8pO87PjfT4',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Génère un magic link pour KAYNZ (u1 = JNG/MID, pools seedés)
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'kaynz@test.rostergg',
})

if (error) { console.error('Error:', error.message); process.exit(1) }

console.log('ACTION_LINK:', data.properties.action_link)
console.log('TOKEN:', data.properties.hashed_token)
