
-- הוספת עמודה external_id לטבלת deliveries
ALTER TABLE IF EXISTS deliveries
ADD COLUMN IF NOT EXISTS external_id text;

-- עדכון מפתח ראשי על טבלת column_mappings אם היא קיימת
ALTER TABLE IF EXISTS column_mappings
DROP CONSTRAINT IF EXISTS column_mappings_pkey,
ADD PRIMARY KEY (id);

-- וידוא שיש עמודת id מסוג UUID בטבלת column_mappings
ALTER TABLE IF EXISTS column_mappings
ALTER COLUMN id TYPE uuid USING (uuid_generate_v4());

-- וידוא שיש עמודת id מסוג UUID בטבלת delivery_history
ALTER TABLE IF EXISTS delivery_history
ALTER COLUMN id TYPE uuid USING (uuid_generate_v4());

-- יצירת אינדקס על external_id בטבלת deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_external_id ON deliveries(external_id);

-- עדכון הרשאות
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.column_mappings ENABLE ROW LEVEL SECURITY;

-- יצירת מדיניות גישה
DROP POLICY IF EXISTS "Allow full access" ON public.deliveries;
CREATE POLICY "Allow full access" ON public.deliveries
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access" ON public.delivery_history;
CREATE POLICY "Allow full access" ON public.delivery_history
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access" ON public.column_mappings;
CREATE POLICY "Allow full access" ON public.column_mappings
    USING (true)
    WITH CHECK (true);
