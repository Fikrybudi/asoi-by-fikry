// =============================================================================
// PLN SURVEY APP - Supabase Connection Test
// Run with: npx ts-node testSupabase.ts
// =============================================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kpsilvibobjvqxanugto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwc2lsdmlib2JqdnF4YW51Z3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTUxMjEsImV4cCI6MjA4MjAzMTEyMX0.7W2JMeVnezluKTlNvHI-_FmfatDYHawUGSXf-ooY0so';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('🔄 Testing Supabase connection...\n');

    // Test 1: Check if tables exist
    console.log('1️⃣ Checking tables...');
    const { data: surveys, error: surveyError } = await supabase
        .from('surveys')
        .select('id')
        .limit(1);

    if (surveyError) {
        console.log('   ❌ surveys table error:', surveyError.message);
    } else {
        console.log('   ✅ surveys table OK');
    }

    const { data: tiang, error: tiangError } = await supabase
        .from('tiang')
        .select('id')
        .limit(1);

    if (tiangError) {
        console.log('   ❌ tiang table error:', tiangError.message);
    } else {
        console.log('   ✅ tiang table OK');
    }

    const { data: gardu, error: garduError } = await supabase
        .from('gardu')
        .select('id')
        .limit(1);

    if (garduError) {
        console.log('   ❌ gardu table error:', garduError.message);
    } else {
        console.log('   ✅ gardu table OK');
    }

    const { data: jalur, error: jalurError } = await supabase
        .from('jalur')
        .select('id')
        .limit(1);

    if (jalurError) {
        console.log('   ❌ jalur table error:', jalurError.message);
    } else {
        console.log('   ✅ jalur table OK');
    }

    // Test 2: Insert test survey
    console.log('\n2️⃣ Testing INSERT...');
    const testId = crypto.randomUUID();
    const { data: insertData, error: insertError } = await supabase
        .from('surveys')
        .insert({
            id: testId,
            nama_survey: 'Test Survey Connection',
            jenis_survey: 'Survey Umum',
            lokasi: 'Test Location',
            surveyor: 'Connection Test',
            tanggal_survey: new Date().toISOString(),
        })
        .select();

    if (insertError) {
        console.log('   ❌ INSERT failed:', insertError.message);
    } else {
        console.log('   ✅ INSERT OK - Created survey:', insertData?.[0]?.nama_survey);
    }

    // Test 3: Read back
    console.log('\n3️⃣ Testing SELECT...');
    const { data: readData, error: readError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', testId)
        .single();

    if (readError) {
        console.log('   ❌ SELECT failed:', readError.message);
    } else {
        console.log('   ✅ SELECT OK - Read survey:', readData?.nama_survey);
    }

    // Test 4: Delete test data
    console.log('\n4️⃣ Testing DELETE...');
    const { error: deleteError } = await supabase
        .from('surveys')
        .delete()
        .eq('id', testId);

    if (deleteError) {
        console.log('   ❌ DELETE failed:', deleteError.message);
    } else {
        console.log('   ✅ DELETE OK - Cleaned up test data');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    const allPassed = !surveyError && !tiangError && !garduError && !jalurError && !insertError && !readError && !deleteError;
    if (allPassed) {
        console.log('✅ ALL TESTS PASSED! Supabase is ready.');
    } else {
        console.log('⚠️ Some tests failed. Please check the errors above.');
    }
    console.log('='.repeat(50));
}

testConnection();
