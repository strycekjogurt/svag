-- =====================================================
-- SVAG - Supabase Database Schema
-- =====================================================
-- Pro spuštění: Otevřete Supabase Dashboard → SQL Editor → Vložte a spusťte tento kód

-- Typy pro subscription
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete');

-- =====================================================
-- TABULKY
-- =====================================================

-- Tabulka pro uživatelské profily s limity a subscription info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tier subscription_tier DEFAULT 'free',
  icon_limit INTEGER DEFAULT 100,
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Stripe billing fields
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status subscription_status DEFAULT 'active',
  subscription_current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabulka pro SVG ikony s kompresí
CREATE TABLE IF NOT EXISTS svg_icons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- SVG data
  name TEXT NOT NULL,
  size NUMERIC NOT NULL,                    -- Původní velikost v KB
  compressed_size NUMERIC,                   -- Velikost po kompresi v KB
  source TEXT,                               -- URL zdroje
  svg_content TEXT NOT NULL,                 -- Base64 gzipped SVG
  is_compressed BOOLEAN DEFAULT TRUE,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabulka pro historii plateb
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payment info
  stripe_payment_intent_id TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'usd',
  status TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXY pro rychlé vyhledávání
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_svg_icons_user_id ON svg_icons(user_id);
CREATE INDEX IF NOT EXISTS idx_svg_icons_created_at ON svg_icons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_svg_icons_name ON svg_icons(name);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) Políčky
-- =====================================================

-- Zapnout RLS na všech tabulkách
ALTER TABLE svg_icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- =============== SVG ICONS Políčky ===============

-- Uživatel může vidět pouze své ikony
CREATE POLICY "Users can view own icons"
  ON svg_icons FOR SELECT
  USING (auth.uid() = user_id);

-- Uživatel může vkládat své ikony (pokud nedosáhl limitu)
CREATE POLICY "Users can insert own icons"
  ON svg_icons FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (SELECT COUNT(*) FROM svg_icons WHERE user_id = auth.uid()) < 
    (SELECT icon_limit FROM user_profiles WHERE id = auth.uid())
  );

-- Uživatel může mazat své ikony
CREATE POLICY "Users can delete own icons"
  ON svg_icons FOR DELETE
  USING (auth.uid() = user_id);

-- =============== USER PROFILES Políčky ===============

-- Uživatel může vidět svůj profil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Uživatel může aktualizovat svůj profil (omezené pole)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin může vidět všechny profily
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Admin může upravovat všechny profily
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============== PAYMENT HISTORY Políčky ===============

-- Uživatel může vidět svou historii plateb
CREATE POLICY "Users can view own payments"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admin může vidět všechny platby
CREATE POLICY "Admins can view all payments"
  ON payment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Funkce pro automatické vytvoření profilu při registraci
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, tier, icon_limit)
  VALUES (NEW.id, NEW.email, 'free', 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pro vytvoření profilu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Funkce pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pro aktualizaci updated_at v user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Funkce pro získání statistik uživatele
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
  icon_count BIGINT,
  icon_limit INTEGER,
  tier subscription_tier,
  total_storage_kb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as icon_count,
    up.icon_limit,
    up.tier,
    COALESCE(SUM(si.compressed_size), 0) as total_storage_kb
  FROM user_profiles up
  LEFT JOIN svg_icons si ON si.user_id = up.id
  WHERE up.id = user_uuid
  GROUP BY up.icon_limit, up.tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkce pro získání celkových statistik (admin)
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  total_users BIGINT,
  free_users BIGINT,
  pro_users BIGINT,
  total_icons BIGINT,
  total_storage_kb NUMERIC,
  monthly_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT up.id)::BIGINT as total_users,
    COUNT(DISTINCT CASE WHEN up.tier = 'free' THEN up.id END)::BIGINT as free_users,
    COUNT(DISTINCT CASE WHEN up.tier = 'pro' THEN up.id END)::BIGINT as pro_users,
    COUNT(si.id)::BIGINT as total_icons,
    COALESCE(SUM(si.compressed_size), 0) as total_storage_kb,
    (COUNT(DISTINCT CASE WHEN up.tier = 'pro' THEN up.id END) * 9.99) as monthly_revenue
  FROM user_profiles up
  LEFT JOIN svg_icons si ON si.user_id = up.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VYTVOŘENÍ PRVNÍHO ADMIN UŽIVATELE
-- =====================================================

-- Po registraci prvního uživatele, spusťte tento příkaz s jeho emailem:
-- UPDATE user_profiles 
-- SET is_admin = TRUE 
-- WHERE email = 'your-admin@email.com';

-- =====================================================
-- HOTOVO!
-- =====================================================

-- Zkontrolujte, zda vše proběhlo v pořádku:
SELECT 'Schema created successfully!' as status;

-- Zobrazit vytvořené tabulky:
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'svg_icons', 'payment_history')
ORDER BY tablename;

