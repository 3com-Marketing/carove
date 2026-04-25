
-- Table: publications
CREATE TABLE public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram',
  caption text,
  hashtags text,
  image_url text,
  generated_image_id uuid REFERENCES public.enhanced_images(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  ai_generated boolean DEFAULT false,
  ai_prompt text,
  ai_tone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: social_accounts
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_user_id text,
  username text,
  avatar_url text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS on publications
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own publications" ON public.publications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own publications" ON public.publications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own publications" ON public.publications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own publications" ON public.publications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS on social_accounts
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts" ON public.social_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own social accounts" ON public.social_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own social accounts" ON public.social_accounts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own social accounts" ON public.social_accounts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger: auto-update updated_at on publications
CREATE OR REPLACE FUNCTION public.fn_publications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_publications_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_publications_updated_at();
