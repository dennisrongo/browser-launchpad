#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'src';

// All expected user-friendly error messages
const expectedErrorMessages = {
  'AI Chat - Missing API Key': [
    'Please configure your API key in widget settings',
    'Configure your API key to start chatting'
  ],
  'AI Chat - Missing Model': [
    'Please select a model in widget settings',
    'Select a model to start chatting'
  ],
  'AI Chat - Invalid API Key Format': [
    'Invalid API key: OpenAI API key must start with "sk-"',
    'API key cannot be empty',
    'OpenAI API key must start with "sk-"',
    'API key appears to be too short'
  ],
  'AI Chat - Invalid API Key (401)': [
    'OpenAI: Invalid API key. Please check your API key in widget settings.',
    'Straico: Invalid API key. Please check your API key in widget settings.'
  ],
  'AI Chat - Access Denied (403)': [
    'Straico: Access denied. Please verify your API key permissions.'
  ],
  'AI Chat - Insufficient Quota': [
    'OpenAI: Insufficient quota. Please check your billing details.',
    'Straico: Insufficient credits. Please top up your account.'
  ],
  'AI Chat - Model Not Found': [
    'OpenAI: Model not found. Please select a valid model in settings.',
    'Straico: Model not found. Please select a valid model in settings.'
  ],
  'AI Chat - Network Error': [
    'OpenAI: Network error. Please check your internet connection and try again.',
    'Straico: Network error. Please check your internet connection and try again.',
    'Network error. Please check your connection.'
  ],
  'AI Chat - Service Error (500)': [
    'OpenAI: Service error. Please try again later.',
    'Straico: Service error. Please try again later.'
  ],
  'AI Chat - Rate Limit (429)': [
    'Rate limit exceeded',
    'Too many requests per minute',
    'Please wait'
  ],
  'Weather - Missing API Key': [
    'Please add your OpenWeatherMap API key in widget settings'
  ],
  'Weather - Invalid API Key': [
    'Invalid API key. Please check your OpenWeatherMap API key'
  ],
  'Weather - City Not Found': [
    'City "${city}" not found. Please check the city name',
    'not found. Please check the city name'
  ],
  'Settings - Import Invalid File': [
    'Invalid file: not a valid JSON object',
    'Invalid file: missing version information',
    'Incompatible version:',
    'Invalid file: missing or invalid data section'
  ],
  'Settings - Import File Too Large': [
    'File is too large',
    'Maximum size is 10MB'
  ],
  'Settings - Storage Quota Exceeded': [
    'Storage quota exceeded',
    'Try exporting some data first or use merge mode'
  ],
  'Settings - Invalid JSON': [
    'Invalid JSON syntax. Please check the file format.'
  ],
  'Settings - Validation Error': [
    'Grid columns must be between 1 and 6',
    'Grid gap must be between 0 and 64 pixels'
  ]
};

// Criteria for user-friendly messages
const userFriendlyCriteria = {
  hasActionableGuidance: (msg) => {
    const actionable = ['please', 'check', 'settings', 'try again', 'verify', 'configure', 'ensure', 'make sure', 'add your', 'select'];
    return actionable.some(word => msg.toLowerCase().includes(word));
  },
  noTechnicalJargon: (msg) => {
    const jargon = ['stack trace', 'undefined', 'null', 'NaN', 'uncaught', 'exception', '0x', 'promise rejection', 'async'];
    return !jargon.some(term => msg.toLowerCase().includes(term));
  },
  isClearAndConcise: (msg) => {
    return msg.length > 10 && msg.length < 200;
  },
  explainsWhat: (msg) => {
    // Should explain what went wrong
    const indicators = ['invalid', 'not found', 'missing', 'failed', 'error', 'exceeded', 'cannot'];
    return indicators.some(ind => msg.toLowerCase().includes(ind));
  }
};

function findErrorMessagesInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const messages = [];

  // Match various error patterns
  const patterns = [
    /throw new Error\(['"`]([^'"`]+)['"`]\)/g,
    /setError\(['"`]([^'"`]+)['"`]\)/g,
    /setValidationError\(['"`]([^'"`]+)['"`]\)/g,
    /error:\s*['"`]([^'"`]+)['"`]/g,
    /errorMessage\s*=\s*['"`]([^'"`]+)['"`]/g,
    /message:\s*['"`]([^'"`]+)['"`]/g,
    /return\s*\{\s*valid:\s*false,\s*error:\s*['"`]([^'"`]+)['"`]\s*\}/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      messages.push(match[1]);
    }
  }

  return messages;
}

function scanDirectory(dir) {
  const allMessages = [];

  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      allMessages.push(...scanDirectory(fullPath));
    } else if (file.name.match(/\.(tsx?|jsx?)$/)) {
      const messages = findErrorMessagesInFile(fullPath);
      allMessages.push(...messages.map(m => ({ file: file.name, message: m })));
    }
  }

  return allMessages;
}

console.log('🔍 Scanning source files for error messages...\n');

const allMessages = scanDirectory(SOURCE_DIR);
const uniqueMessages = [...new Set(allMessages.map(m => m.message))];

console.log(`✓ Found ${uniqueMessages.length} unique error messages in ${allMessages.length} occurrences\n`);

console.log('📋 ANALYSIS OF USER-FRIENDLY ERROR MESSAGES');
console.log('=' .repeat(80));

let totalChecks = 0;
let passedChecks = 0;

for (const [category, expectedList] of Object.entries(expectedErrorMessages)) {
  console.log(`\n📁 ${category}`);
  console.log('-'.repeat(80));

  const categoryPassed = expectedList.some(expectedMsg => {
    return uniqueMessages.some(actualMsg =>
      actualMsg.toLowerCase().includes(expectedMsg.toLowerCase()) ||
      expectedMsg.toLowerCase().includes(actualMsg.toLowerCase())
    );
  });

  totalChecks++;
  if (categoryPassed) {
    passedChecks++;
    console.log('  ✅ PASS - User-friendly error message found');
    // Show matching message
    for (const expectedMsg of expectedList) {
      const match = uniqueMessages.find(actualMsg =>
        actualMsg.toLowerCase().includes(expectedMsg.toLowerCase()) ||
        expectedMsg.toLowerCase().includes(actualMsg.toLowerCase())
      );
      if (match) {
        console.log(`     Found: "${match}"`);
        break;
      }
    }
  } else {
    console.log('  ❌ FAIL - No user-friendly error message found');
    console.log(`     Expected one of: ${expectedList.join(' | ')}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('📊 DETAILED MESSAGE ANALYSIS');
console.log('=' .repeat(80));

console.log('\n🔍 Checking ALL error messages against user-friendly criteria:\n');

const analysisResults = uniqueMessages.map(msg => {
  const checks = {
    message: msg,
    hasActionableGuidance: userFriendlyCriteria.hasActionableGuidance(msg),
    noTechnicalJargon: userFriendlyCriteria.noTechnicalJargon(msg),
    isClearAndConcise: userFriendlyCriteria.isClearAndConcise(msg),
    explainsWhat: userFriendlyCriteria.explainsWhat(msg)
  };
  checks.passed = Object.values(checks).filter(v => v === true).length;
  return checks;
});

let totalMessageChecks = 0;
let totalMessagePasses = 0;

for (const result of analysisResults) {
  const allPassed = result.hasActionableGuidance && result.noTechnicalJargon &&
                    result.isClearAndConcise && result.explainsWhat;

  totalMessageChecks++;
  if (allPassed) totalMessagePasses++;

  console.log(`\n"${result.message}"`);
  console.log(`  ${result.hasActionableGuidance ? '✅' : '❌'} Actionable guidance`);
  console.log(`  ${result.noTechnicalJargon ? '✅' : '❌'} No technical jargon`);
  console.log(`  ${result.isClearAndConcise ? '✅' : '❌'} Clear and concise (10-200 chars)`);
  console.log(`  ${result.explainsWhat ? '✅' : '❌'} Explains what went wrong`);
  console.log(`  Overall: ${allPassed ? '✅ USER-FRIENDLY' : '⚠️  NEEDS IMPROVEMENT'}`);
}

console.log('\n' + '='.repeat(80));
console.log('📈 FINAL RESULTS');
console.log('=' .repeat(80));

console.log(`\n✅ Error Categories: ${passedChecks}/${totalChecks} passed`);
console.log(`✅ Individual Messages: ${totalMessagePasses}/${totalMessageChecks} fully user-friendly`);

const overallPass = passedChecks === totalChecks && totalMessagePasses === totalMessageChecks;
console.log(`\n${overallPass ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);

if (overallPass) {
  console.log('\n✅ Feature #149: User-friendly error messages - PASSING');
  console.log('\nAll error messages are:');
  console.log('  • Clear and in plain language');
  console.log('  • Actionable - tell users what to do next');
  console.log('  • Contextual - explain what went wrong');
  console.log('  • User-friendly - no stack traces or technical codes');
}

process.exit(overallPass ? 0 : 1);
