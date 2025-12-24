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
-- ROW LEVEL SECURITY (Optional - Enable if needed)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiang ENABLE ROW LEVEL SECURITY;
ALTER TABLE gardu ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalur ENABLE ROW LEVEL SECURITY;

-- Policy: Team Shared Access (Authenticated Users Only)
-- Users must be logged in to View/Insert/Update/Delete.
-- Anonymous users are blocked.

CREATE POLICY "Enable access for authenticated users only" ON surveys FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for authenticated users only" ON tiang FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for authenticated users only" ON gardu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for authenticated users only" ON jalur FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- STORAGE BUCKET FOR PHOTOS
-- Run this in Storage section or via API
-- =============================================================================

-- Create a public bucket called 'survey-photos'
-- In Supabase Dashboard: Storage > Create bucket > Name: survey-photos > Public: Yes
