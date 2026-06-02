// Database types — will be generated via `supabase gen types` in Phase 2
// Placeholder until schema migrations are applied

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type SubscriptionStatus = 'free' | 'premium'
export type DuoRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type TeamApplicationStatus = 'pending' | 'accepted' | 'declined'
export type MessageKind = 'text' | 'system' | 'lobby_invite'
export type ConversationType = 'duo' | 'team'
export type MemberRole = 'captain' | 'member'

export type LoLRole = 'TOP' | 'JNG' | 'MID' | 'ADC' | 'SUP'
export type LoLTier =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'EMERALD'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER'
export type LoLQueue = 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
export type LoLPlatform = 'euw1' | 'na1' | 'kr' | 'eun1' | 'br1' | 'la1' | 'la2' | 'oc1' | 'tr1'
export type LoLRegion = 'europe' | 'americas' | 'asia' | 'sea'
