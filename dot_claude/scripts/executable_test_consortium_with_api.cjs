#!/usr/bin/env node
/**
 * Test Multi-LLM Consortium with Real API Calls
 *
 * Full test using the orchestrator with actual API integration
 */

const LLMConsortiumOrchestrator = require('./llm_consortium_orchestrator.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testConsortium() {
  console.log('🧪 Testing Multi-LLM Consortium with Real API Integration\n');
  console.log('='.repeat(60));

  const prompt = "Generate a brief TTX scenario title for a ransomware attack targeting a criminal justice organization with CJIS data. Just give me ONE creative title in 10 words or less.";

  console.log('\n📝 Test Prompt:', prompt);
  console.log('\n' + '='.repeat(60) + '\n');

  // Initialize orchestrator
  const orchestrator = new LLMConsortiumOrchestrator();

  // Test each LLM individually
  const results = [];

  // Test Claude
  console.log('🤖 Testing Claude Sonnet 4.5...');
  try {
    const response = await orchestrator.callLLM('claude', prompt, { recent_learnings: [], total_memories: 0, task: prompt });
    console.log('✅ Claude responded:', response.content.substring(0, 200));
    results.push({ llm: 'Claude Sonnet 4.5', response: response.content, timestamp: new Date().toISOString(), success: true });
  } catch (error) {
    console.error('❌ Claude failed:', error.message);
    results.push({ llm: 'Claude Sonnet 4.5', response: error.message, timestamp: new Date().toISOString(), success: false });
  }

  // Test Gemini
  console.log('\n🤖 Testing Gemini...');
  try {
    const response = await orchestrator.callLLM('gemini', prompt, { recent_learnings: [], total_memories: 0, task: prompt });
    console.log('✅ Gemini responded:', response.content.substring(0, 200));
    results.push({ llm: 'Gemini', response: response.content, timestamp: new Date().toISOString(), success: true });
  } catch (error) {
    console.error('❌ Gemini failed:', error.message);
    results.push({ llm: 'Gemini', response: error.message, timestamp: new Date().toISOString(), success: false });
  }

  // Test Codex
  console.log('\n🤖 Testing Codex (GPT-4)...');
  try {
    const response = await orchestrator.callLLM('gpt4', prompt, { recent_learnings: [], total_memories: 0, task: prompt });
    console.log('✅ Codex responded:', response.content.substring(0, 200));
    results.push({ llm: 'Codex', response: response.content, timestamp: new Date().toISOString(), success: true });
  } catch (error) {
    console.error('❌ Codex failed:', error.message);
    results.push({ llm: 'Codex', response: error.message, timestamp: new Date().toISOString(), success: false });
  }

  // Test Perplexity (NOW WITH API!)
  console.log('\n🤖 Testing Perplexity API...');
  try {
    const response = await orchestrator.callLLM('perplexity', prompt, { recent_learnings: [], total_memories: 0, task: prompt });
    console.log('✅ Perplexity responded:', response.content.substring(0, 200));
    results.push({ llm: 'Perplexity', response: response.content, timestamp: new Date().toISOString(), success: true });
  } catch (error) {
    console.error('❌ Perplexity failed:', error.message);
    results.push({ llm: 'Perplexity', response: error.message, timestamp: new Date().toISOString(), success: false });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

  // Save results
  const outputFile = path.join(os.homedir(), '.claude', 'consortium_test_results_with_api.json');

  const output = {
    test_date: new Date().toISOString(),
    test_prompt: prompt,
    results: results,
    summary: {
      successful,
      failed,
      success_rate: `${((successful / results.length) * 100).toFixed(1)}%`
    }
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\n💾 Results saved to: ${outputFile}`);

  // If all 4 LLMs worked, run a full consortium test
  if (successful === 4) {
    console.log('\n🎉 ALL 4 LLMs WORKING! Running full consortium test...\n');

    const fullResult = await orchestrator.executeTask(
      "Generate 3 different TTX scenario titles for ransomware targeting criminal justice",
      'ttx_generation'
    );

    console.log('\n🏆 FULL CONSORTIUM RESULT:\n');
    console.log(fullResult);

    orchestrator.showStats();
  } else {
    console.log('\n⚠️  Not all LLMs are working yet. Fix the errors above and try again.\n');
  }

  console.log('\n🎉 Test Complete!\n');
}

testConsortium().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});
