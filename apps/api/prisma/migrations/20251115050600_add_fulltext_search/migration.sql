-- Add full-text search support using PostgreSQL tsvector
-- This enables advanced full-text search with ranking and better performance

-- Add search_vector column to content_entries
ALTER TABLE "content_entries" ADD COLUMN "searchVector" tsvector;

-- Create function to generate search vector from JSON data
CREATE OR REPLACE FUNCTION generate_content_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  search_text TEXT := '';
  json_key TEXT;
  json_value TEXT;
BEGIN
  -- Extract all string values from JSON data
  -- Iterate through JSON and collect all string values
  FOR json_key, json_value IN SELECT key, value FROM jsonb_each_text(COALESCE(NEW.data, '{}'::jsonb))
  LOOP
    -- Only include if value is a string (not object/array)
    IF json_value IS NOT NULL AND json_value != '' AND jsonb_typeof(COALESCE(NEW.data, '{}'::jsonb)->json_key) = 'string' THEN
      search_text := search_text || ' ' || json_value;
    END IF;
  END LOOP;
  
  -- Create search vector with weighted terms
  NEW."searchVector" := 
    setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(search_text, '')), 'B');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
CREATE TRIGGER content_entries_search_vector_update
  BEFORE INSERT OR UPDATE ON "content_entries"
  FOR EACH ROW
  EXECUTE FUNCTION generate_content_search_vector();

-- Create GIN index for fast full-text search
CREATE INDEX "content_entries_search_vector_idx" ON "content_entries" USING GIN ("searchVector");

-- Add composite index for tenant filtering with search
CREATE INDEX "content_entries_tenantId_search_vector_idx" ON "content_entries" ("tenantId") WHERE "searchVector" IS NOT NULL;

-- Update existing rows (handle nested JSON properly)
-- Skip if no rows exist to avoid errors
DO $$
DECLARE
  rec RECORD;
  search_text TEXT;
  row_count INT;
BEGIN
  SELECT COUNT(*) INTO row_count FROM "content_entries";
  IF row_count = 0 THEN
    RETURN;
  END IF;
  
  FOR rec IN SELECT id, data, status FROM "content_entries"
  LOOP
    search_text := '';
    -- Extract string values from JSON (only top-level strings)
    BEGIN
      SELECT string_agg(value::text, ' ')
      INTO search_text
      FROM jsonb_each_text(COALESCE(rec.data, '{}'::jsonb)) AS j(key, value)
      WHERE value IS NOT NULL 
        AND value != ''
        AND jsonb_typeof(COALESCE(rec.data, '{}'::jsonb)->j.key) = 'string';
    EXCEPTION WHEN OTHERS THEN
      -- If extraction fails, use empty string
      search_text := '';
    END;
    
    -- Update search vector
    UPDATE "content_entries"
    SET "searchVector" = 
      setweight(to_tsvector('english', COALESCE(rec.status, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(search_text, '')), 'B')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Add full-text search support to collections
ALTER TABLE "collection_items" ADD COLUMN "searchVector" tsvector;

-- Create function for collection items
CREATE OR REPLACE FUNCTION generate_collection_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  search_text TEXT := '';
  json_key TEXT;
  json_value TEXT;
BEGIN
  -- Extract all string values from JSON data (only top-level strings)
  FOR json_key, json_value IN SELECT key, value FROM jsonb_each_text(COALESCE(NEW.data, '{}'::jsonb))
  LOOP
    -- Only include if value is a string (not object/array)
    IF json_value IS NOT NULL AND json_value != '' AND jsonb_typeof(COALESCE(NEW.data, '{}'::jsonb)->json_key) = 'string' THEN
      search_text := search_text || ' ' || json_value;
    END IF;
  END LOOP;
  
  NEW."searchVector" := 
    setweight(to_tsvector('english', COALESCE(NEW.status::text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(search_text, '')), 'B');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for collection items
CREATE TRIGGER collection_items_search_vector_update
  BEFORE INSERT OR UPDATE ON "collection_items"
  FOR EACH ROW
  EXECUTE FUNCTION generate_collection_search_vector();

-- Create GIN index for collection items
CREATE INDEX "collection_items_search_vector_idx" ON "collection_items" USING GIN ("searchVector");
CREATE INDEX "collection_items_tenantId_search_vector_idx" ON "collection_items" ("tenantId") WHERE "searchVector" IS NOT NULL;

-- Update existing collection items (handle nested JSON properly)
-- Skip if no rows exist to avoid errors
DO $$
DECLARE
  rec RECORD;
  search_text TEXT;
  row_count INT;
BEGIN
  SELECT COUNT(*) INTO row_count FROM "collection_items";
  IF row_count = 0 THEN
    RETURN;
  END IF;
  
  FOR rec IN SELECT id, data, status FROM "collection_items"
  LOOP
    search_text := '';
    -- Extract string values from JSON (only top-level strings)
    BEGIN
      SELECT string_agg(value::text, ' ')
      INTO search_text
      FROM jsonb_each_text(COALESCE(rec.data, '{}'::jsonb)) AS j(key, value)
      WHERE value IS NOT NULL 
        AND value != ''
        AND jsonb_typeof(COALESCE(rec.data, '{}'::jsonb)->j.key) = 'string';
    EXCEPTION WHEN OTHERS THEN
      -- If extraction fails, use empty string
      search_text := '';
    END;
    
    -- Update search vector
    UPDATE "collection_items"
    SET "searchVector" = 
      setweight(to_tsvector('english', COALESCE(rec.status::text, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(search_text, '')), 'B')
    WHERE id = rec.id;
  END LOOP;
END $$;

