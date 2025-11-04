#!/usr/bin/env node

/**
 * Poll Migration Runner
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Starting poll migration...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../database/migration_v1.1.0_polls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute migration
    await pool.query(sql);

    console.log('\n✅ Migration completed successfully!');
    
    // Verify changes
    console.log('\n🔍 Verifying changes...\n');
    
    // Check if poll column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' AND column_name = 'poll'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ posts.poll column added:', columnCheck.rows[0].data_type);
    } else {
      console.log('❌ posts.poll column NOT found');
    }
    
    // Check if poll_votes table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'poll_votes'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ poll_votes table created');
    } else {
      console.log('❌ poll_votes table NOT found');
    }
    
    // Check functions
    const functionCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('vote_poll', 'get_poll_results')
    `);
    
    console.log(`✅ ${functionCheck.rows.length}/2 functions created:`, 
      functionCheck.rows.map(r => r.routine_name).join(', '));
    
    console.log('\n🎉 Poll feature ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set');
  process.exit(1);
}

runMigration();
