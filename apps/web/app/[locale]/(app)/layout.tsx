import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shell/AppShell'
import type { ReactNode } from 'react'

const TIER_ORDER = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER']

function rankLabel(tier: string | null, division: string | null, lp: number | null): string {
  if (!tier) return ''
  const t = tier.toUpperCase()
  const high = ['MASTER','GRANDMASTER','CHALLENGER'].includes(t)
  return high
    ? `${t} · ${lp ?? 0} LP`
    : `${t} ${division ?? ''} · ${lp ?? 0} LP`.trim()
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let shellUser = null
  if (user) {
    const [{ data: profile }, { data: ra }] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
      supabase
        .from('riot_accounts')
        .select('game_name, tag_line, ranks(tier, division, league_points, queue)')
        .eq('profile_id', user.id)
        .maybeSingle(),
    ])
    const soloRank = (ra as any)?.ranks?.find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
    shellUser = {
      displayName: profile?.display_name ?? null,
      gameName:    (ra as any)?.game_name ?? null,
      tagLine:     (ra as any)?.tag_line  ?? null,
      avatarUrl:   profile?.avatar_url   ?? null,
      rankKey:     soloRank?.tier?.toLowerCase() ?? null,
      rankLabel:   rankLabel(soloRank?.tier, soloRank?.division, soloRank?.league_points),
    }
  }

  return <AppShell user={shellUser}>{children}</AppShell>
}
