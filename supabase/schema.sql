-- Drop existing tables if they exist
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables in order of dependencies

-- 1. Base tables (no foreign keys)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tables that depend only on businesses
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL,
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, day_of_week)
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  last_visit TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tables that depend on other tables
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Create indexes
CREATE INDEX clients_business_id_idx ON clients(business_id);
CREATE INDEX clients_phone_idx ON clients(phone);
CREATE INDEX clients_email_idx ON clients(email);
CREATE INDEX appointments_business_id_idx ON appointments(business_id);
CREATE INDEX appointments_client_id_idx ON appointments(client_id);
CREATE INDEX appointments_professional_id_idx ON appointments(professional_id);
CREATE INDEX appointments_service_id_idx ON appointments(service_id);
CREATE INDEX services_business_id_idx ON services(business_id);
CREATE INDEX professionals_business_id_idx ON professionals(business_id);
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
CREATE INDEX profiles_business_id_idx ON profiles(business_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at
  BEFORE UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Businesses policies
CREATE POLICY "enable_business_select" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "enable_business_insert" ON businesses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND business_id IS NOT NULL
    )
  );

CREATE POLICY "enable_business_update" ON businesses
  FOR UPDATE USING (
    id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "enable_business_delete" ON businesses
  FOR DELETE USING (
    id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Clients policies
CREATE POLICY "Users can view their business clients" ON clients
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create clients for their business" ON clients
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their business clients" ON clients
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their business clients" ON clients
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

-- Professionals policies
CREATE POLICY "Users can view their business professionals" ON professionals
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create professionals for their business" ON professionals
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their business professionals" ON professionals
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their business professionals" ON professionals
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

-- Services policies
CREATE POLICY "Users can view their business services" ON services
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create services for their business" ON services
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their business services" ON services
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their business services" ON services
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

-- Business hours policies
CREATE POLICY "Users can view their business hours" ON business_hours
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create business hours" ON business_hours
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their business hours" ON business_hours
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their business hours" ON business_hours
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

-- Appointments policies
CREATE POLICY "Users can view their business appointments" ON appointments
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create appointments for their business" ON appointments
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their business appointments" ON appointments
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their business appointments" ON appointments
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

-- Subscriptions policies
CREATE POLICY "Users can view their business subscription" ON subscriptions
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create subscription for their business" ON subscriptions
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their business subscription" ON subscriptions
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their business subscription" ON subscriptions
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

