import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const t = await getTranslations('home')
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').select('count').limit(0)
  const connected = !error || error.code === 'PGRST116' || error.message.includes('does not exist')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-5xl font-black tracking-tight text-white">{t('title')}</h1>
        <p className="text-zinc-400">{t('subtitle')}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`}
        />
        <span className="text-zinc-400">
          Supabase {connected ? 'connecté' : 'non connecté'}
        </span>
      </div>
    </main>
  )
}
