-- Migration 14: Add partial fulfillment tracking to order_items
-- fulfillment_status: overall status for this design+color line item
-- fulfilled_quantities: per-size detail array, e.g.
--   [{"size":"M","quantity":10,"status":"dispatched"},{"size":"L","quantity":5,"status":"picked"}]

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfilled_quantities JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add 'part dispatched' to the allowed status values on the orders table
-- (no DB constraint exists; enforced at application layer)
