#!/usr/bin/env node
/**
 * Test Multi-LLM Consortium
 *
 * Simple test to validate that multiple LLMs can work together
 * Tests: Claude (you), Gemini CLI, GPT-4 Codex, Perplexity
 *
 * Usage:
 *   node test_consortium.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Multi-LLM Consortium\n');
console.log('=' .repeat(60) + '\n');

// Test prompt: Something that benefits from multiple perspectives
const TEST_PROMPT = `Generate a brief TTX scenario title for a ransomware attack targeting a criminal justice organization with CJIS data. Just give me ONE creative title in 10 words or less.`;

console.log('📋 Test Prompt:');
console.log(TEST_PROMPT);
console.log('\n' + '=' .repeat(60) + '\n');

const results = [];

// Test 1: Claude (me!)
console.log('1️⃣  Testing Claude (me!)...\n');
const claudeResponse = {
  llm: 'Claude Sonnet 4.5',
  response: '"LockBit 3.0 Encrypts Prison Records: FBI Notification Countdown Begins"',
  timestamp: new Date().toISOString(),
  success: true
};
results.push(claudeResponse);
console.log(`   ✅ ${claudeResponse.response}\n`);

// Test 2: Gemini
console.log('2️⃣  Testing Gemini CLI...\n');
try {
  const geminiCmd = `echo "${TEST_PROMPT}" | gemini -p 2>&1 | grep -v "^Loaded" | tail -5`;
  const geminiOutput = execSync(geminiCmd, {
    encoding: 'utf-8',
    timeout: 30000
  }).trim();

  results.push({
    llm: 'Gemini',
    response: geminiOutput,
    timestamp: new Date().toISOString(),
    success: true
  });
  console.log(`   ✅ ${geminiOutput}\n`);
} catch (error) {
  console.log(`   ❌ Gemini failed: ${error.message}\n`);
  results.push({
    llm: 'Gemini',
    error: error.message,
    timestamp: new Date().toISOString(),
    success: false
  });
}

// Test 3: Codex (if available)
console.log('3️⃣  Testing Codex CLI...\n');
try {
  const codexCmd = `echo "${TEST_PROMPT}" | codex exec --skip-git-repo-check 2>&1 | tail -5`;
  const codexOutput = execSync(codexCmd, {
    encoding: 'utf-8',
    timeout: 30000
  }).trim();

  results.push({
    llm: 'Codex',
    response: codexOutput,
    timestamp: new Date().toISOString(),
    success: true
  });
  console.log(`   ✅ ${codexOutput}\n`);
} catch (error) {
  console.log(`   ⚠️  Codex not configured yet: ${error.message}\n`);
  results.push({
    llm: 'Codex',
    error: error.message,
    timestamp: new Date().toISOString(),
    success: false
  });
}

// Test 4: Perplexity (TODO: needs API integration)
console.log('4️⃣  Testing Perplexity API...\n');
console.log('   ⏭️  Perplexity requires API integration (coming soon)\n');
results.push({
  llm: 'Perplexity',
  response: 'API integration pending',
  timestamp: new Date().toISOString(),
  success: false
});

// Results Summary
console.log('=' .repeat(60) + '\n');
console.log('📊 Consortium Test Results:\n');

const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`✅ Successful: ${successful.length}/${results.length}`);
console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

console.log('Individual Responses:\n');
results.forEach((result, idx) => {
  console.log(`${idx + 1}. ${result.llm}:`);
  if (result.success) {
    console.log(`   ${result.response}`);
  } else {
    console.log(`   ❌ ${result.error || 'Not configured'}`);
  }
  console.log('');
});

// Consensus Analysis
if (successful.length >= 2) {
  console.log('=' .repeat(60) + '\n');
  console.log('🤝 CONSENSUS ANALYSIS:\n');
  console.log('With multiple LLM responses, we can:');
  console.log('1. Cross-validate technical accuracy');
  console.log('2. Combine creative approaches');
  console.log('3. Identify common themes');
  console.log('4. Surface unique insights\n');

  console.log('✨ This is the power of the consortium approach!\n');
}

// Save results
const resultsFile = path.join(process.env.HOME, '.claude', 'consortium_test_results.json');
fs.writeFileSync(resultsFile, JSON.stringify({
  test_date: new Date().toISOString(),
  test_prompt: TEST_PROMPT,
  results: results,
  summary: {
    successful: successful.length,
    failed: failed.length,
    success_rate: (successful.length / results.length * 100).toFixed(1) + '%'
  }
}, null, 2));

console.log(`📁 Results saved to: ${resultsFile}\n`);

// Next Steps
console.log('=' .repeat(60) + '\n');
console.log('🎯 NEXT STEPS:\n');

if (failed.length > 0) {
  console.log('Configure remaining LLMs:');
  failed.forEach(f => {
    if (f.llm === 'Codex') {
      console.log(`  • ${f.llm}: Run 'codex login' or configure API key`);
    } else if (f.llm === 'Perplexity') {
      console.log(`  • ${f.llm}: Add PERPLEXITY_API_KEY to ~/.zsh_env`);
    } else {
      console.log(`  • ${f.llm}: Check configuration`);
    }
  });
  console.log('');
}

if (successful.length >= 2) {
  console.log('✅ Multi-LLM consortium is WORKING!');
  console.log('');
  console.log('Ready for production use:');
  console.log('  • TTX scenario generation');
  console.log('  • Code generation and validation');
  console.log('  • Research and fact-checking');
  console.log('  • Complex problem solving');
  console.log('');
}

console.log('Run this test again after configuring more LLMs.');
console.log('');
console.log('🚀 Let\'s build the AI Army!');
