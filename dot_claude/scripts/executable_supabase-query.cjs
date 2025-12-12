#!/usr/bin/env node
/**
 * Generic Supabase Query Tool
 *
 * Allows running queries against ANY Supabase project using environment variables
 *
 * USAGE:
 *   # Test connection
 *   SUPABASE_URL=$THEOSOPHIA_SUPABASE_URL SUPABASE_KEY=$THEOSOPHIA_SUPABASE_SERVICE_ROLE_KEY \
 *     node supabase-query.cjs test
 *
 *   # Run query
 *   SUPABASE_URL=$THEOSOPHIA_SUPABASE_URL SUPABASE_KEY=$THEOSOPHIA_SUPABASE_SERVICE_ROLE_KEY \
 *     node supabase-query.cjs query "SELECT * FROM topics LIMIT 5"
 *
 *   # Insert data
 *   SUPABASE_URL=$THEOSOPHIA_SUPABASE_URL SUPABASE_KEY=$THEOSOPHIA_SUPABASE_SERVICE_ROLE_KEY \
 *     node supabase-query.cjs insert topics '{"name":"Test","description":"Test topic"}'
 *
 *   # Execute JavaScript
 *   SUPABASE_URL=$THEOSOPHIA_SUPABASE_URL SUPABASE_KEY=$THEOSOPHIA_SUPABASE_SERVICE_ROLE_KEY \
 *     node supabase-query.cjs exec "async (supabase) => { return await supabase.from('topics').select('*'); }"
 */

const { createClient } = require('@supabase/supabase-js');

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

// Get credentials from environment
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables required');
  console.error('\nExample:');
  console.error('  SUPABASE_URL=$THEOSOPHIA_SUPABASE_URL SUPABASE_KEY=$THEOSOPHIA_SUPABASE_SERVICE_ROLE_KEY \\');
  console.error('    node supabase-query.cjs test');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
  try {
    console.log('🔍 Testing connection to:', url.substring(0, 30) + '...\n');

    // Try a simple query
    const { data, error } = await supabase.from('collaborators').select('*').limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Connection successful!');
    console.log('✅ Database accessible!\n');

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function runQuery(sql) {
  try {
    console.log('📊 Running SQL query...\n');
    const { data, error } = await supabase.rpc('exec_sql_batch', {
      sql_batch: sql
    });

    if (error) throw error;

    console.log('Results:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function insertData(table, jsonData) {
  try {
    const data = JSON.parse(jsonData);
    console.log('📝 Inserting into', table + '...\n');

    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();

    if (error) throw error;

    console.log('✅ Inserted:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function execCode(code) {
  try {
    console.log('⚡ Executing custom code...\n');
    const func = eval(code);
    const result = await func(supabase);

    console.log('Results:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function listTables() {
  try {
    console.log('📋 Listing tables...\n');

    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Fallback: try common tables
      console.log('Using fallback method...\n');
      const tables = [
        'collaborators', 'topics', 'sources', 'research_content',
        'knowledge_nodes', 'knowledge_edges', 'research_sessions',
        'pattern_discoveries', 'insights', 'research_questions', 'tags', 'audit_log'
      ];

      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log('  ✅', table.padEnd(25), ':', count, 'rows');
        }
      }
    } else {
      data.forEach(t => console.log('  -', t.table_name));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function tableStats() {
  try {
    console.log('📊 Database Statistics\n');

    const tables = [
      'collaborators', 'topics', 'sources', 'research_content',
      'knowledge_nodes', 'knowledge_edges', 'research_sessions',
      'pattern_discoveries', 'insights', 'research_questions', 'tags'
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log('  ' + table.padEnd(25) + ':', count || 0);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main command router
(async () => {
  switch (command) {
    case 'test':
      await testConnection();
      break;

    case 'query':
      if (!arg1) {
        console.error('❌ SQL query required');
        process.exit(1);
      }
      await runQuery(arg1);
      break;

    case 'insert':
      if (!arg1 || !arg2) {
        console.error('❌ Table name and JSON data required');
        process.exit(1);
      }
      await insertData(arg1, arg2);
      break;

    case 'exec':
      if (!arg1) {
        console.error('❌ Code required');
        process.exit(1);
      }
      await execCode(arg1);
      break;

    case 'tables':
      await listTables();
      break;

    case 'stats':
      await tableStats();
      break;

    default:
      console.log('Usage: node supabase-query.cjs <command> [args]');
      console.log('\nCommands:');
      console.log('  test              - Test database connection');
      console.log('  tables            - List all tables');
      console.log('  stats             - Show table row counts');
      console.log('  query <sql>       - Run SQL query');
      console.log('  insert <table> <json> - Insert data');
      console.log('  exec <code>       - Execute JavaScript code');
      console.log('\nEnvironment Variables Required:');
      console.log('  SUPABASE_URL      - Supabase project URL');
      console.log('  SUPABASE_KEY      - Supabase service role key');
      process.exit(1);
  }
})();
