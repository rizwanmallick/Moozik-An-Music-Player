require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const isPlaceholder =
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl.includes('YOUR_PROJECT_REF') ||
  supabaseKey === 'your-anon-key-here';

if (isPlaceholder) {
  console.error('\nMissing Supabase credentials in .env\n');
  console.error('1. Open Supabase Dashboard → your project → Project Settings → API');
  console.error('2. Copy Project URL and anon public key into .env:\n');
  console.error('   SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('   SUPABASE_ANON_KEY=eyJhbGci...\n');
  console.error('3. Run the SQL from supabase/schema.sql in Supabase SQL Editor');
  console.error('4. Restart: npm start\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
