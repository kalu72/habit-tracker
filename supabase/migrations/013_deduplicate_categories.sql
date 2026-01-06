-- =====================================================
-- Deduplicate Categories & Add Constraint
-- =====================================================

-- 1. Clean up existing duplicates
DO $$
DECLARE
    r RECORD;
    primary_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- Find groups of duplicates
    FOR r IN
        SELECT user_id, name, array_agg(id ORDER BY created_at) as ids
        FROM categories
        GROUP BY user_id, name
        HAVING count(*) > 1
    LOOP
        -- The first one (oldest) will be the primary
        primary_id := r.ids[1];
        
        -- The rest are duplicates
        duplicate_ids := r.ids[2:array_length(r.ids, 1)];

        -- Update any habits using the duplicate categories to use the primary one
        UPDATE habits
        SET category_id = primary_id
        WHERE category_id = ANY(duplicate_ids);

        -- Delete the duplicate categories
        DELETE FROM categories
        WHERE id = ANY(duplicate_ids);
        
        RAISE NOTICE 'Merged duplicates for category "%" (User: %)', r.name, r.user_id;
    END LOOP;
END $$;

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE categories 
ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);
