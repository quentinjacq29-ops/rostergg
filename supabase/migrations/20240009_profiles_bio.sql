-- Migration 20240009 : colonne bio sur profiles (D7)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;
