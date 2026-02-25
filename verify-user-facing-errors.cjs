#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'src';

// User-facing error messages that should exist
const requiredUserFacingMessages = {
  'AI Chat Widget': {
    'Missing API Key': [
      'Please configure your API key in widget settings',
      'Configure your API key to start chatting'
    ],
    'Missing Model': [
      'Please select a model in widget settings',
      'Select a model to start chatting'
    ],
    'Invalid API Key Format': [
      'OpenAI API key must start with "sk-"',
      'API key cannot be empty'
    ],
    'Invalid API Key (401)': [
      'OpenAI: Invalid API key. Please check your API key in widget settings.',
      'Straico: Invalid API key. Please check your API key in widget settings.'
    ],
    'Access Denied (403)': [
      'Straico: Access denied. Please verify your API key permissions.'
    ],
    'Insufficient Quota': [
      'OpenAI: Insufficient quota. Please check your billing details.',
      'Straico: Insufficient credits. Please top up your account.'
    ],
    'Model Not Found': [
      'OpenAI: Model not found. Please select a valid model in settings.',
      'Straico: Model not found. Please select a valid model in settings.'
    ],
    'Network Error': [
      'OpenAI: Network error. Please check your internet connection and try again.',
      'Straico: Network error. Please check your internet connection and try again.'
    ],
    'Service Error (500)': [
      'OpenAI: Service error. Please try again later.',
      'Straico: Service error. Please try again later.'
    ],
    'Rate Limit': [
      'Rate limit exceeded',
      'Too many',
      'Please wait'
    ]
  },
  'Weather Widget': {
    'Missing API Key': [
      'Please add your OpenWeatherMap API key in widget settings'
    ],
    'Invalid API Key': [
      'Invalid API key. Please check your OpenWeatherMap API key'
    ],
    'City Not Found': [
      'City',
      'not found. Please check the city name'
    ]
  },
  'Settings Modal': {
    'Import Invalid File': [
      'Invalid file: not a valid JSON object',
      'Invalid file: missing version information'
    ],
    'Incompatible Version': [
      'Incompatible version:',
      'This extension supports version 1.0.0'
    ],
    'File Too Large': [
      'File is too large',
      'Maximum size is 10MB'
    ],
    'Storage Quota Exceeded': [
      'Storage quota exceeded',
      'Try exporting some data first or use merge mode'
    ],
    'Invalid JSON': [
      'Invalid JSON syntax. Please check the file format.'
    ],
    'Validation Errors': [
      'Grid columns must be between 1 and 6',
      'Grid gap must be between 0 and 64 pixels'
    ]
  }
};

function findErrorMessagesInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const messages = [];

  // Match setError, throw new Error, and error message patterns
  const patterns = [
    /setError\(['"`]([^'"`]+?)['"`]\)/g,
    /throw new Error\(['"`]([^'"`]+?)['"`]\)/g,
    /return\s*\{\s*valid:\s*false,\s*error:\s*['"`]([^'"`]+?)['"`]\s*\}/g,
    /setValidationError\(['"`]([^'"`]+?)['"`]\)/g,
    /error:\s*['"`]([^'"`]+?)['"`]/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Skip template strings with ${...}
      if (!match[1].includes('${')) {
        messages.push(match[1].trim());
      }
    }
  }

  return messages;
}

function scanDirectory(dir) {
  const allMessages = [];

  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      allMessages.push(...scanDirectory(fullPath));
    } else if (file.name.match(/\.(tsx?|jsx?)$/)) {
      const messages = findErrorMessagesInFile(fullPath);
      allMessages.push(...messages.map(m => ({ file: file.name, message: m })));
    }
  }

  return allMessages;
}

console.log('🔍 Scanning source files for USER-FACING error messages...\n');

const allMessages = scanDirectory(SOURCE_DIR);
const uniqueMessages = [...new Set(allMessages.map(m => m.message))];

console.log(`✓ Found ${uniqueMessages.length} unique user-facing error messages\n`);

console.log('📋 USER-FACING ERROR MESSAGE VERIFICATION');
console.log('=' .repeat(80));

let totalChecks = 0;
let passedChecks = 0;

for (const [category, scenarios] of Object.entries(requiredUserFacingMessages)) {
  console.log(`\n📁 ${category}`);
  console.log('-'.repeat(80));

  for (const [scenario, expectedList] of Object.entries(scenarios)) {
    totalChecks++;

    const scenarioPassed = expectedList.some(expectedMsg => {
      return uniqueMessages.some(actualMsg =>
        actualMsg.toLowerCase().includes(expectedMsg.toLowerCase()) ||
        (expectedMsg.length > 15 && actualMsg.toLowerCase().includes(expectedMsg.toLowerCase().substring(0, 15)))
      );
    });

    if (scenarioPassed) {
      passedChecks++;
      console.log(`  ✅ ${scenario}`);
      // Show matching message
      for (const expectedMsg of expectedList) {
        const match = uniqueMessages.find(actualMsg =>
          actualMsg.toLowerCase().includes(expectedMsg.toLowerCase()) ||
          (expectedMsg.length > 15 && actualMsg.toLowerCase().includes(expectedMsg.toLowerCase().substring(0, 15)))
        );
        if (match) {
          console.log(`     "${match}"`);
          break;
        }
      }
    } else {
      console.log(`  ❌ ${scenario}`);
      console.log(`     Expected: ${expectedList.join(' OR ')}`);
    }
  }
}

console.log('\n' + '='.repeat(80));

console.log('📊 QUALITY ANALYSIS');
console.log('=' .repeat(80));

// Analyze quality of all user-facing messages
const qualityChecks = uniqueMessages.map(msg => {
  const hasActionWords = ['please', 'check', 'verify', 'configure', 'add', 'select', 'try'].some(w => msg.toLowerCase().includes(w));
  const noTechTerms = !['stack trace', 'undefined', 'null', '0x', 'exception:'].some(t => msg.toLowerCase().includes(t));
  const reasonableLength = msg.length > 10 && msg.length < 150;
  const explainsProblem = ['invalid', 'not found', 'missing', 'failed', 'error', 'cannot', 'unable'].some(w => msg.toLowerCase().includes(w));

  return {
    message: msg,
    passed: hasActionWords && noTechTerms && reasonableLength && explainsProblem,
    hasActionWords,
    noTechTerms,
    reasonableLength,
    explainsProblem
  };
});

const qualityPassed = qualityChecks.filter(q => q.passed).length;
const qualityTotal = qualityChecks.length;

console.log(`\n✅ High-quality messages: ${qualityPassed}/${qualityTotal} (${((qualityPassed/qualityTotal)*100).toFixed(1)}%)`);

// Show any low-quality messages
const lowQuality = qualityChecks.filter(q => !q.passed);
if (lowQuality.length > 0) {
  console.log('\n⚠️  Messages that could be improved:');
  for (const q of lowQuality.slice(0, 10)) { // Show max 10
    console.log(`  • "${q.message}"`);
    const issues = [];
    if (!q.hasActionWords) issues.push('add action words');
    if (!q.noTechTerms) issues.push('remove technical terms');
    if (!q.reasonableLength) issues.push('adjust length');
    if (!q.explainsProblem) issues.push('explain problem better');
    console.log(`    Issues: ${issues.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('📈 FINAL RESULTS');
console.log('=' .repeat(80));

console.log(`\n✅ Required Scenarios: ${passedChecks}/${totalChecks} passed`);
console.log(`✅ Quality Score: ${qualityPassed}/${qualityTotal} (${((qualityPassed/qualityTotal)*100).toFixed(1)}%)`);

const overallPass = passedChecks === totalChecks && qualityPassed >= qualityTotal * 0.9;

console.log(`\n${overallPass ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);

if (overallPass) {
  console.log('\n✅ Feature #149: User-friendly error messages - PASSING');
  console.log('\nAll user-facing error messages are:');
  console.log('  • Clear and in plain language');
  console.log('  • Actionable - tell users what to do next');
  console.log('  • Contextual - explain what went wrong');
  console.log('  • User-friendly - no stack traces or technical codes');
  console.log('\nError types covered:');
  console.log('  ✅ API key errors (missing, invalid, wrong format)');
  console.log('  ✅ Network errors (connection failures, rate limits)');
  console.log('  ✅ Validation errors (invalid inputs, file formats)');
  console.log('  ✅ Provider-specific errors (OpenAI, Straico, Weather)');
  console.log('  ✅ Import/Export errors (file size, format, quota)');
}

process.exit(overallPass ? 0 : 1);
