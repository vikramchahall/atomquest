-- ============================================
-- AtomQuest Goal Portal — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  department TEXT,
  manager_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'employee')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- GOALS TABLE
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) NOT NULL,
  manager_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  thrust_area TEXT,
  uom_type TEXT DEFAULT 'min_numeric',
  target TEXT,
  actual_achievement TEXT,
  weightage NUMERIC DEFAULT 10,
  status TEXT DEFAULT 'Not Started',
  approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending', 'Approved', 'Rejected')),
  locked BOOLEAN DEFAULT false,
  rejection_note TEXT,
  approved_at TIMESTAMPTZ,
  is_shared BOOLEAN DEFAULT false,
  shared_from UUID REFERENCES goals(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- QUARTERLY CHECKINS TABLE
CREATE TABLE quarterly_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id),
  employee_id UUID REFERENCES profiles(id),
  manager_id UUID REFERENCES profiles(id),
  quarter TEXT,
  actual_achievement TEXT,
  status TEXT,
  manager_comment TEXT,
  checkin_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, employee_id, quarter)
);

-- CYCLES TABLE
CREATE TABLE cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year TEXT NOT NULL,
  active_quarter TEXT DEFAULT 'Q1',
  q1_start DATE, q1_end DATE,
  q2_start DATE, q2_end DATE,
  q3_start DATE, q3_end DATE,
  q4_start DATE, q4_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AUDIT LOGS TABLE
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ESCALATIONS TABLE (Bonus Feature)
CREATE TABLE escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT, -- 'goal_not_submitted', 'approval_overdue', 'checkin_overdue'
  employee_id UUID REFERENCES profiles(id),
  manager_id UUID REFERENCES profiles(id),
  due_date DATE,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own; managers see team; admins see all
CREATE POLICY "profiles_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_manager_view" ON profiles FOR SELECT USING (
  manager_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Goals: employees see own; managers see team; admins see all
CREATE POLICY "goals_employee" ON goals FOR ALL USING (
  employee_id = auth.uid() OR
  manager_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Checkins: involved parties + admins
CREATE POLICY "checkins_access" ON quarterly_checkins FOR ALL USING (
  employee_id = auth.uid() OR
  manager_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Audit logs: admins + own entries
CREATE POLICY "audit_logs_admin" ON audit_logs FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- Cycles: anyone can read; only admin can write
CREATE POLICY "cycles_read" ON cycles FOR SELECT USING (true);
CREATE POLICY "cycles_admin" ON cycles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- SEED DEMO DATA
-- ============================================
-- After running this schema, create 3 users in Supabase Auth Dashboard:
-- employee@demo.com / demo1234 (role: employee)
-- manager@demo.com / demo1234 (role: manager)
-- admin@demo.com / demo1234 (role: admin)
--
-- Then update their profiles via SQL:
-- UPDATE profiles SET role = 'manager', full_name = 'Demo Manager' WHERE email = 'manager@demo.com';
-- UPDATE profiles SET role = 'admin', full_name = 'Demo Admin' WHERE email = 'admin@demo.com';
-- UPDATE profiles SET full_name = 'Demo Employee', manager_id = (SELECT id FROM profiles WHERE email = 'manager@demo.com') WHERE email = 'employee@demo.com';