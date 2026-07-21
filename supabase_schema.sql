-- =============================================================================
-- PLN SURVEY APP - Supabase Database Schema
-- Run this SQL in Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- SURVEYS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_survey TEXT NOT NULL,
    jenis_survey TEXT NOT NULL,
    lokasi TEXT,
    kecamatan TEXT,
    kelurahan TEXT,
    nama_feeder TEXT,
    nama_gardu_induk TEXT,
    surveyor TEXT,
    tanggal_survey TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TIANG (POLE) TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS tiang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    nomor_urut INTEGER,
    latitude FLOAT,
    longitude FLOAT,
    jenis_tiang TEXT,
    tinggi_tiang TEXT,
    kekuatan_tiang TEXT,
    jenis_jaringan TEXT,
    konstruksi TEXT,
    perlengkapan JSONB DEFAULT '[]',
    foto JSONB DEFAULT '[]',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster survey lookups
CREATE INDEX IF NOT EXISTS idx_tiang_survey_id ON tiang(survey_id);

-- =============================================================================
-- GARDU (SUBSTATION) TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS gardu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    nomor_gardu TEXT NOT NULL,
    nama_gardu TEXT,
    latitude FLOAT,
    longitude FLOAT,
    jenis_gardu TEXT,
    kapasitas_kva INTEGER,
    merek_trafo TEXT,
    tahun_pasang INTEGER,
    peralatan_proteksi JSONB DEFAULT '[]',
    foto JSONB DEFAULT '[]',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster survey lookups
CREATE INDEX IF NOT EXISTS idx_gardu_survey_id ON gardu(survey_id);

-- =============================================================================
-- JALUR (CABLE ROUTE) TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS jalur (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    nama_jalur TEXT,
    koordinat JSONB DEFAULT '[]',
    jenis_jaringan TEXT,
    jenis_penghantar TEXT,
    penampang_mm TEXT,
    panjang_meter FLOAT,
    tiang_ids JSONB DEFAULT '[]',
    status TEXT,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster survey lookups
CREATE INDEX IF NOT EXISTS idx_jalur_survey_id ON jalur(survey_id);

-- =============================================================================
-- ROW LEVEL SECURITY (Owner & Superadmin Logic)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiang ENABLE ROW LEVEL SECURITY;
ALTER TABLE gardu ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalur ENABLE ROW LEVEL SECURITY;

-- 1. SURVYEYS TABLE POLICIES
-- Boleh membuat survey (insert) jika sudah login, otomatis menjadi miliknya
CREATE POLICY "Insert own survey" ON surveys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Boleh melihat (select) JIKA dia pembuatnya, ATAU dia adalah superadmin
CREATE POLICY "Select surveys" ON surveys FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'
);

-- Boleh mengedit/menghapus (update/delete) JIKA dia pembuatnya, ATAU dia adalah superadmin
CREATE POLICY "Update own surveys or superadmin" ON surveys FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'
);
CREATE POLICY "Delete own surveys or superadmin" ON surveys FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'
);

-- 2. CHILD TABLES POLICIES (Tiang, Gardu, Jalur)
-- Child tables rely on the surveys.user_id for access control
CREATE POLICY "Child Select" ON tiang FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = tiang.survey_id AND (surveys.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'))
);
CREATE POLICY "Child Insert/Update/Delete" ON tiang FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = tiang.survey_id AND (surveys.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'))
);

CREATE POLICY "Child Select" ON gardu FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = gardu.survey_id AND (surveys.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'))
);
CREATE POLICY "Child Insert/Update/Delete" ON gardu FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = gardu.survey_id AND (surveys.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'))
);

CREATE POLICY "Child Select" ON jalur FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = jalur.survey_id AND (surveys.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'))
);
CREATE POLICY "Child Insert/Update/Delete" ON jalur FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM surveys WHERE surveys.id = jalur.survey_id AND (surveys.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin'))
);

-- =============================================================================
-- STORAGE BUCKET FOR PHOTOS
-- Run this in Storage section or via API
-- =============================================================================

-- Create a public bucket called 'survey-photos'
-- In Supabase Dashboard: Storage > Create bucket > Name: survey-photos > Public: Yes

-- =============================================================================
-- HOW TO SET A USER AS SUPERADMIN
-- =============================================================================

-- Run this snippet in the Supabase SQL Editor whenever you want to grant
-- superadmin privileges to an existing user account.
-- Change 'email_akun_anda@domain.com' to the actual user's email.

/*
UPDATE auth.users
SET raw_user_meta_data = '{"role": "superadmin"}'::jsonb
WHERE email = 'email_akun_anda@domain.com';
*/
