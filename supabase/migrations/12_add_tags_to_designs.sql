-- ============================================================================
-- Add Tags Column to Designs
-- ============================================================================
-- Stores preset and custom tags as a text array on each design.
-- Examples: {'New Arrival','Best Seller','Festival Edit'}
-- ============================================================================

ALTER TABLE public.designs
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.designs.tags IS 'Manual design tags selected by admin, including preset and custom tags';

CREATE INDEX IF NOT EXISTS idx_designs_tags_gin
ON public.designs
USING gin (tags);
