'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PresenceState = { user_id: string; online_at: string }

export function usePresence(userId: string | null) {
  const [onlineIds,   setOnlineIds]   = useState<Set<string>>(new Set())
  const [onlineCount, setOnlineCount] = useState(0)
  // Ref pour éviter les doubles abonnements (React StrictMode)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Si un canal existe déjà (StrictMode second mount), le supprimer proprement
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase.channel(`presence:duo`, {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    function syncState() {
      const raw = channel.presenceState<PresenceState>()
      const ids = new Set(Object.values(raw).flat().map((p: PresenceState) => p.user_id))
      setOnlineIds(ids)
      setOnlineCount(ids.size)
    }

    channel
      .on('presence', { event: 'sync'  }, syncState)
      .on('presence', { event: 'join'  }, syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    return () => {
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  return { onlineIds, onlineCount }
}
