
-- Table for enhanced images metadata
CREATE TABLE public.enhanced_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_path text NOT NULL,
  enhanced_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enhanced_images ENABLE ROW LEVEL SECURITY;

-- Users can see all enhanced images (shared across team)
CREATE POLICY "Authenticated users can view enhanced images"
  ON public.enhanced_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert enhanced images"
  ON public.enhanced_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own enhanced images"
  ON public.enhanced_images FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for enhanced images
INSERT INTO storage.buckets (id, name, public) VALUES ('enhanced-images', 'enhanced-images', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload enhanced images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'enhanced-images');

CREATE POLICY "Anyone can view enhanced images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'enhanced-images');

CREATE POLICY "Authenticated users can delete enhanced images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'enhanced-images');
