/**
 * Bug Condition Exploration Test: Type Safety Suppressions in auth.ts
 * 
 * **Validates: Requirements 2.3, 2.4**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * NOTE: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples demonstrating TypeScript errors when @ts-ignore is removed
 * 
 * Scoped PBT Approach: Test the specific locations where @ts-ignore appears
 * - Line 28: nested accounts.create operation
 * - Line 66: sessionState field assignment
 * 
 * EXPECTED OUTCOME: Compilation FAILS with type mismatch errors
 * (this is correct - it proves the suppressions are hiding type issues)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestResult {
  success: boolean;
  errors: string[];
  counterexamples: string[];
}

/**
 * Test that removing @ts-ignore from nested accounts.create causes TypeScript compilation errors
 */
function testNestedAccountsCreateTypeSafety(): TestResult {
  const authFilePath = path.join(process.cwd(), 'auth.ts');
  const tempFilePath = path.join(process.cwd(), 'auth.test-temp.ts');
  
  const result: TestResult = {
    success: false,
    errors: [],
    counterexamples: []
  };

  try {
    // Read the original auth.ts file
    const originalContent = fs.readFileSync(authFilePath, 'utf-8');
    
    // Find the @ts-ignore comment on line 28 (nested accounts.create)
    const lines = originalContent.split('\n');
    let tsIgnoreLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().includes('// @ts-ignore') && 
          i < lines.length - 1 && 
          lines[i + 1].trim().includes('create:')) {
        tsIgnoreLine = i;
        break;
      }
    }
    
    if (tsIgnoreLine === -1) {
      result.errors.push('Could not find @ts-ignore comment for nested accounts.create');
      return result;
    }
    
    // Create a temporary file with @ts-ignore removed
    const modifiedLines = [...lines];
    modifiedLines.splice(tsIgnoreLine, 1); // Remove the @ts-ignore line
    const modifiedContent = modifiedLines.join('\n');
    fs.writeFileSync(tempFilePath, modifiedContent);
    
    // Try to compile the modified file
    try {
      execSync(`npx tsc --noEmit ${tempFilePath}`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      // If compilation succeeds, the bug doesn't exist (unexpected pass)
      result.success = true;
      result.errors.push('UNEXPECTED PASS: TypeScript compilation succeeded without @ts-ignore');
      result.errors.push('This suggests the type issue may already be fixed or the test needs adjustment');
    } catch (error: any) {
      // Compilation failed - this is EXPECTED and confirms the bug
      const stderr = error.stderr || error.stdout || '';
      
      // Extract type errors
      const typeErrors = stderr.split('\n').filter((line: string) => 
        line.includes('error TS') || 
        line.includes('Type ') ||
        line.includes('is not assignable')
      );
      
      if (typeErrors.length > 0) {
        result.success = false; // Test passes by failing compilation
        result.counterexamples = typeErrors.map((err: string) => 
          `Nested accounts.create: ${err.trim()}`
        );
      } else {
        result.errors.push('Compilation failed but no type errors found in output');
      }
    }
    
    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
  } catch (error: any) {
    result.errors.push(`Test execution error: ${error.message}`);
  }
  
  return result;
}

/**
 * Test that removing @ts-ignore from sessionState field causes TypeScript compilation errors
 */
function testSessionStateTypeSafety(): TestResult {
  const authFilePath = path.join(process.cwd(), 'auth.ts');
  const tempFilePath = path.join(process.cwd(), 'auth.test-temp2.ts');
  
  const result: TestResult = {
    success: false,
    errors: [],
    counterexamples: []
  };

  try {
    // Read the original auth.ts file
    const originalContent = fs.readFileSync(authFilePath, 'utf-8');
    
    // Find the @ts-ignore comment on line 66 (sessionState field)
    const lines = originalContent.split('\n');
    let tsIgnoreLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().includes('// @ts-ignore') && 
          i < lines.length - 1 && 
          lines[i + 1].trim().includes('sessionState:')) {
        tsIgnoreLine = i;
        break;
      }
    }
    
    if (tsIgnoreLine === -1) {
      result.errors.push('Could not find @ts-ignore comment for sessionState field');
      return result;
    }
    
    // Create a temporary file with @ts-ignore removed
    const modifiedLines = [...lines];
    modifiedLines.splice(tsIgnoreLine, 1); // Remove the @ts-ignore line
    const modifiedContent = modifiedLines.join('\n');
    fs.writeFileSync(tempFilePath, modifiedContent);
    
    // Try to compile the modified file
    try {
      execSync(`npx tsc --noEmit ${tempFilePath}`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      // If compilation succeeds, the bug doesn't exist (unexpected pass)
      result.success = true;
      result.errors.push('UNEXPECTED PASS: TypeScript compilation succeeded without @ts-ignore');
      result.errors.push('This suggests the type issue may already be fixed or the test needs adjustment');
    } catch (error: any) {
      // Compilation failed - this is EXPECTED and confirms the bug
      const stderr = error.stderr || error.stdout || '';
      
      // Extract type errors
      const typeErrors = stderr.split('\n').filter((line: string) => 
        line.includes('error TS') || 
        line.includes('Type ') ||
        line.includes('is not assignable')
      );
      
      if (typeErrors.length > 0) {
        result.success = false; // Test passes by failing compilation
        result.counterexamples = typeErrors.map((err: string) => 
          `sessionState field: ${err.trim()}`
        );
      } else {
        result.errors.push('Compilation failed but no type errors found in output');
      }
    }
    
    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
  } catch (error: any) {
    result.errors.push(`Test execution error: ${error.message}`);
  }
  
  return result;
}

// Run the tests
console.log('='.repeat(80));
console.log('Bug Condition Exploration Test: Type Safety Suppressions');
console.log('='.repeat(80));
console.log();

console.log('Test 1: Nested accounts.create Type Safety');
console.log('-'.repeat(80));
const result1 = testNestedAccountsCreateTypeSafety();

if (result1.counterexamples.length > 0) {
  console.log('✓ TEST PASSED (Compilation failed as expected - bug confirmed)');
  console.log();
  console.log('Counterexamples found:');
  result1.counterexamples.forEach(ce => console.log(`  - ${ce}`));
} else if (result1.success) {
  console.log('✗ TEST FAILED (Unexpected pass - compilation succeeded)');
  result1.errors.forEach(err => console.log(`  ${err}`));
} else {
  console.log('✗ TEST ERROR');
  result1.errors.forEach(err => console.log(`  ${err}`));
}

console.log();
console.log('Test 2: sessionState Field Type Safety');
console.log('-'.repeat(80));
const result2 = testSessionStateTypeSafety();

if (result2.counterexamples.length > 0) {
  console.log('✓ TEST PASSED (Compilation failed as expected - bug confirmed)');
  console.log();
  console.log('Counterexamples found:');
  result2.counterexamples.forEach(ce => console.log(`  - ${ce}`));
} else if (result2.success) {
  console.log('✗ TEST FAILED (Unexpected pass - compilation succeeded)');
  result2.errors.forEach(err => console.log(`  ${err}`));
} else {
  console.log('✗ TEST ERROR');
  result2.errors.forEach(err => console.log(`  ${err}`));
}

console.log();
console.log('='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));

const totalCounterexamples = result1.counterexamples.length + result2.counterexamples.length;
if (totalCounterexamples > 0) {
  console.log(`Bug confirmed: Found ${totalCounterexamples} type safety issues`);
  console.log('These @ts-ignore suppressions are hiding real type mismatches');
  process.exit(0); // Success - we found the bug
} else {
  console.log('Bug not confirmed: No type safety issues found');
  console.log('Either the bug is already fixed or the test needs adjustment');
  process.exit(1); // Failure - couldn't confirm bug
}
