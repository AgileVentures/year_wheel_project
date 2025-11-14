#!/usr/bin/env node

/**
 * Anonymize fixture data by replacing real personal information with test data
 * 
 * This script:
 * - Replaces emails with test@example.com pattern
 * - Replaces names with "Test User"
 * - Replaces wheel/team titles with generic names
 * - Preserves UUIDs structure but replaces with consistent test UUIDs
 * - Maintains data relationships (same user ID across files)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = resolve(__dirname, '..', 'cypress', 'fixtures');

// Mapping for consistent anonymization
const userIdMap = new Map();
const teamIdMap = new Map();
const wheelIdMap = new Map();
const emailMap = new Map();

let userCounter = 1;
let teamCounter = 1;
let wheelCounter = 1;

function anonymizeUserId(realId) {
  if (!userIdMap.has(realId)) {
    const testId = `11111111-2222-3333-4444-55555555555${userCounter}`;
    userIdMap.set(realId, testId);
    userCounter++;
  }
  return userIdMap.get(realId);
}

function anonymizeTeamId(realId) {
  if (!teamIdMap.has(realId)) {
    const testId = `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee0${teamCounter}`;
    teamIdMap.set(realId, testId);
    teamCounter++;
  }
  return teamIdMap.get(realId);
}

function anonymizeWheelId(realId) {
  if (!wheelIdMap.has(realId)) {
    const testId = `99999999-aaaa-bbbb-cccc-ddddddddd${String(wheelCounter).padStart(3, '0')}`;
    wheelIdMap.set(realId, testId);
    wheelCounter++;
  }
  return wheelIdMap.get(realId);
}

function anonymizeEmail(realEmail) {
  if (!emailMap.has(realEmail)) {
    const count = emailMap.size + 1;
    const testEmail = count === 1 ? 'test.user@example.com' : `user${count}@example.com`;
    emailMap.set(realEmail, testEmail);
  }
  return emailMap.get(realEmail);
}

function anonymizeWheelTitle(title) {
  const wheelNum = wheelCounter;
  return `Test Wheel ${wheelNum}`;
}

function anonymizeTeamName(name) {
  const teamNum = teamIdMap.size;
  return `Test Team ${teamNum}`;
}

function anonymizeName(name) {
  return 'Test User';
}

function anonymizeObject(obj, depth = 0) {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => anonymizeObject(item, depth + 1));
  }
  
  if (typeof obj !== 'object') return obj;
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Handle different field types
    if (key === 'id' || key === 'user_id' || key === 'owner_id') {
      result[key] = anonymizeUserId(value);
    } else if (key === 'team_id') {
      result[key] = anonymizeTeamId(value);
    } else if (key === 'wheel_id' || (key === 'id' && depth > 0 && result.title)) {
      result[key] = anonymizeWheelId(value);
    } else if (key === 'email') {
      result[key] = anonymizeEmail(value);
    } else if (key === 'title' && (obj.year || obj.colors)) {
      // Wheel title
      result[key] = anonymizeWheelTitle(value);
    } else if (key === 'name' && (obj.owner_id || obj.description)) {
      // Team name
      result[key] = anonymizeTeamName(value);
    } else if (key === 'full_name' || key === 'name') {
      result[key] = anonymizeName(value);
    } else if (key === 'avatar_url' || key === 'picture') {
      result[key] = 'https://api.dicebear.com/7.x/avataaars/svg?seed=test';
    } else if (key === 'provider_id' || key === 'sub') {
      result[key] = '100000000000000000000';
    } else if (key === 'description' && typeof value === 'string') {
      result[key] = 'Test description for planning activities';
    } else if (key === 'stripe_customer_id') {
      result[key] = 'cus_test123';
    } else if (key === 'stripe_subscription_id') {
      result[key] = 'sub_test123';
    } else if (key === 'stripe_price_id') {
      result[key] = 'price_test123';
    } else if (typeof value === 'object') {
      result[key] = anonymizeObject(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function anonymizeFixture(filename) {
  const filePath = join(fixturesDir, filename);
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const anonymized = anonymizeObject(data);
    
    writeFileSync(filePath, JSON.stringify(anonymized, null, 2), 'utf8');
    console.log(`✅ Anonymized ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to anonymize ${filename}:`, error.message);
  }
}

console.log('🔒 Anonymizing fixtures...\n');

// Process all JSON fixtures except template files
const fixtures = readdirSync(fixturesDir)
  .filter(f => f.endsWith('.json') && !f.includes('template'));

fixtures.forEach(anonymizeFixture);

console.log('\n✨ Anonymization complete!');
console.log('\n📊 Summary:');
console.log(`   Users: ${userIdMap.size}`);
console.log(`   Teams: ${teamIdMap.size}`);
console.log(`   Wheels: ${wheelIdMap.size}`);
console.log(`   Emails: ${emailMap.size}`);
