import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/shell/AppShell'
import DuoFeed from '@/components/duo/DuoFeed'
import PromoGutter13 from '@/components/promo/PromoGutter13'

// Page de QA uniquement — jamais indexée, non liée dans la nav.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Promo preview (QA)',
}

function rankLabel(tier: string | null, division: string | null, lp: number | null): string {
  if (!tier) return ''
  const t = tier.toUpperCase()
  const high = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(t)
  return high ? `${t} · ${lp ?? 0} LP` : `${t} ${division ?? ''} · ${lp ?? 0} LP`.trim()
}

type Props = { params: { locale: string }; searchParams: { variant?: string } }

export default async function PromoPreviewPage({ params: { locale } }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Données shell (sidebar) + prefs feed — mêmes sources que le layout (app) et /duo
  let shellUser = null
  let pendingCount = 0
  let unreadMsgCount = 0
  let initialPrefs = null

  if (user) {
    const [{ data: profile }, { data: ra }, { data: badge }, { data: prefs }] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
      supabase.from('riot_accounts').select('game_name, tag_line, ranks(tier, division, league_points, queue)').eq('profile_id', user.id).maybeSingle(),
      supabase.rpc('inbox_badge', { p_user_id: user.id }),
      supabase.from('matching_prefs').select('looking_for_roles, rank_floor, regions').eq('profile_id', user.id).maybeSingle(),
    ])
    const soloRank = (ra as any)?.ranks?.find((r: any) => r.queue === 'RANKED_SOLO_5x5') ?? null
    shellUser = {
      id: user.id,
      displayName: profile?.display_name ?? null,
      gameName: (ra as any)?.game_name ?? null,
      tagLine: (ra as any)?.tag_line ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      rankKey: soloRank?.tier?.toLowerCase() ?? null,
      rankLabel: rankLabel(soloRank?.tier, soloRank?.division, soloRank?.league_points),
    }
    pendingCount = (badge as any)?.pending_requests ?? 0
    unreadMsgCount = (badge as any)?.unread_conv_count ?? 0
    if (prefs) {
      initialPrefs = {
        looking_for_roles: prefs.looking_for_roles ?? [],
        rank_floor: prefs.rank_floor ?? null,
        region: prefs.regions?.[0] ?? null,
      }
    }
  }

  // L'app réelle (sidebar + feed) en rendu « encadrable » → scalée dans le well.
  const appSlot = (
    <AppShell user={shellUser} pendingCount={pendingCount} unreadMsgCount={unreadMsgCount} locale={locale} framed>
      <DuoFeed userId={user?.id ?? null} initialPrefs={initialPrefs} />
    </AppShell>
  )

  return <PromoGutter13 appSlot={appSlot} />
}
