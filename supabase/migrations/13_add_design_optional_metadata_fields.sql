-- ============================================================================
-- Add Optional Design Metadata Fields
-- ============================================================================
-- Adds optional attributes requested for design creation/editing:
-- - work_type
-- - occasion
-- - collection
-- - design_month_year (month/year stored as first day of month)
-- ============================================================================

ALTER TABLE public.designs
ADD COLUMN IF NOT EXISTS work_type text,
ADD COLUMN IF NOT EXISTS occasion text,
ADD COLUMN IF NOT EXISTS collection text,
ADD COLUMN IF NOT EXISTS design_month_year date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'designs_work_type_check'
  ) THEN
    ALTER TABLE public.designs
    ADD CONSTRAINT designs_work_type_check
    CHECK (work_type IS NULL OR work_type IN ('plain', 'printed', 'emboidered', 'chikankari', 'shaded', 'handwork'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'designs_occasion_check'
  ) THEN
    ALTER TABLE public.designs
    ADD CONSTRAINT designs_occasion_check
    CHECK (occasion IS NULL OR occasion IN ('festive', 'casual', 'wedding', 'office wear', 'daily wear'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'designs_collection_check'
  ) THEN
    ALTER TABLE public.designs
    ADD CONSTRAINT designs_collection_check
    CHECK (collection IS NULL OR collection IN ('summer collection', 'winter collection', 'puja collection', 'eid collection'));
  END IF;
END $$;

COMMENT ON COLUMN public.designs.work_type IS 'Optional work type tag for design';
COMMENT ON COLUMN public.designs.occasion IS 'Optional occasion tag for design';
COMMENT ON COLUMN public.designs.collection IS 'Optional seasonal/festival collection tag for design';
COMMENT ON COLUMN public.designs.design_month_year IS 'Optional month-year for design lifecycle, stored as first day of month';

CREATE INDEX IF NOT EXISTS idx_designs_design_month_year
ON public.designs(design_month_year);
