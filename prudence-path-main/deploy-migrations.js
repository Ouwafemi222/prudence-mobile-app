// Deploy Supabase Migrations Script
// Uses Supabase Management API to apply migrations

const SUPABASE_ACCESS_TOKEN = 'sbp_97f19b2a591268f828b9af7cd1195cef014a8fa0';
const PROJECT_REF = 'xpvabdfleomjpytvvjux';
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

const fs = require('fs');
const path = require('path');

const migrations = [
  'supabase/migrations/20260115000000_skills_system_overhaul.sql',
  'supabase/migrations/20260115000001_create_training_plans_bucket.sql',
  'supabase/migrations/20260115000002_support_multiple_trainers_per_group.sql',
  'supabase/migrations/20260115000003_populate_skills_data.sql',
];

async function deployMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  console.log(`\n📦 Deploying: ${fileName}...`);

  try {
    const response = await fetch(`${API_URL}/database/migrations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName.replace('.sql', ''),
        sql: sql,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully deployed: ${fileName}`);
    return result;
  } catch (error) {
    console.error(`❌ Error deploying ${fileName}:`, error.message);
    throw error;
  }
}

async function deployAll() {
  console.log('🚀 Starting migration deployment...\n');

  for (const migration of migrations) {
    try {
      await deployMigration(migration);
      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`\n❌ Deployment failed at: ${migration}`);
      console.error('Please check the error above and fix it before continuing.');
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations deployed successfully!');
}

deployAll().catch(console.error);
