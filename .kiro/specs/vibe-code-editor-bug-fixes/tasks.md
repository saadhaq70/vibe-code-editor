# Implementation Plan

## Overview

This task list implements fixes for 13 bugs across 6 categories using the exploratory bugfix workflow. The bugs involve type safety suppressions (2), unused imports (1), error handling in dashboard actions (5), error handling in playground actions (3), code formatting (1), and template path configuration (1).

---

## Category 1: Type Safety Suppressions in auth.ts (2 bugs)

- [x] 1. Write bug condition exploration test for type safety suppressions
  - **Property 1: Bug Condition** - Type Safety Suppressions in auth.ts
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating TypeScript errors when @ts-ignore is removed
  - **Scoped PBT Approach**: Test the specific locations where @ts-ignore appears (line 28 for nested accounts.create, line 66 for sessionState)
  - Test that removing @ts-ignore from nested accounts.create operation (line 28) causes TypeScript compilation errors
  - Test that removing @ts-ignore from sessionState field assignment (line 66) causes TypeScript compilation errors
  - Run TypeScript compiler on UNFIXED code with @ts-ignore removed
  - **EXPECTED OUTCOME**: Compilation FAILS with type mismatch errors (this is correct - it proves the suppressions are hiding type issues)
  - Document the specific TypeScript errors found (e.g., "Type 'string | null' is not assignable to type 'string | undefined'")
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 2.3, 2.4_

- [ ] 2. Write preservation property tests for authentication flow (BEFORE implementing fix)
  - **Property 2: Preservation** - Authentication Flow Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful authentication operations
  - Test new user sign-in: verify User and Account records are created in a transaction
  - Test existing user sign-in: verify Account linking works correctly
  - Test JWT token generation: verify token contains expected fields (sub, name, email, role)
  - Test session creation: verify session includes userId and role
  - Write property-based tests capturing these authentication patterns
  - Generate random valid user/account data and verify sign-in produces correct database operations
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline authentication behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix type safety suppressions in auth.ts

  - [ ] 3.1 Remove @ts-ignore and implement proper type handling
    - Remove `// @ts-ignore` comment on line 28 (nested accounts.create)
    - Use nullish coalescing for optional Account fields: `refreshToken: account.refresh_token ?? undefined`
    - Apply same pattern to: `accessToken`, `expiresAt`, `tokenType`, `scope`, `idToken`, `sessionState`
    - Remove `// @ts-ignore` comment on line 66 (sessionState field)
    - Use explicit optional handling: `sessionState: account.session_state ?? undefined`
    - Verify TypeScript compilation succeeds without suppressions
    - _Bug_Condition: isBugCondition(input) where input.filePath == "auth.ts" AND input.hasTypeSuppressionComment_
    - _Expected_Behavior: TypeScript compiles without errors, optional fields properly typed with undefined handling_
    - _Preservation: All authentication flows (new user sign-in, existing user linking, JWT creation, session creation) produce identical database operations and response objects_
    - _Requirements: 2.3, 2.4, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Type Safety Without Suppressions
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (compilation succeeds without @ts-ignore)
    - When this test passes, it confirms proper TypeScript types are used
    - Run TypeScript compiler on FIXED code
    - **EXPECTED OUTCOME**: Compilation PASSES (confirms type safety achieved)
    - _Requirements: 2.3, 2.4_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Authentication Flow Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from task 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in authentication flow)
    - Verify User/Account creation, JWT tokens, and sessions work identically

---

## Category 2: Unused Import in app/api/chat/route.ts (1 bug)

- [ ] 4. Write bug condition exploration test for unused import
  - **Property 1: Bug Condition** - Unused Import in chat API
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexample showing unused import exists
  - **Scoped PBT Approach**: Run ESLint with unused-imports rule on app/api/chat/route.ts
  - Test that ESLint detects "error" import from "console" is declared but never used
  - Run linter on UNFIXED code
  - **EXPECTED OUTCOME**: Linter FAILS with unused import warning (this is correct - it proves the unused import exists)
  - Document the specific ESLint warning found
  - Mark task complete when test is written, run, and warning is documented
  - _Requirements: 2.5_

- [ ] 5. Write preservation property tests for chat API (BEFORE implementing fix)
  - **Property 2: Preservation** - Chat API Response Format Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful chat operations
  - Test valid message: verify response structure includes { response, timestamp }
  - Test invalid message (empty): verify 400 error response format
  - Test AI generation: verify same prompt structure sent to Ollama API
  - Write property-based tests capturing these chat API patterns
  - Generate random valid/invalid messages and verify responses match expected format
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline chat API behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.7, 3.8_

- [ ] 6. Fix unused import in chat API

  - [ ] 6.1 Remove unused import statement
    - Delete line 2: `import { error } from "console";`
    - Verify no other code references this import
    - _Bug_Condition: isBugCondition(input) where input.filePath == "app/api/chat/route.ts" AND input.hasUnusedImport_
    - _Expected_Behavior: No unused imports exist, ESLint passes with no warnings_
    - _Preservation: All chat API functionality (message validation, AI response generation, error handling) produces identical responses_
    - _Requirements: 2.5, 3.7, 3.8_

  - [ ] 6.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Clean Imports
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior (no unused import warnings)
    - When this test passes, it confirms imports are clean
    - Run ESLint on FIXED code
    - **EXPECTED OUTCOME**: Linter PASSES with no warnings (confirms unused import removed)
    - _Requirements: 2.5_

  - [ ] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Chat API Response Format Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 5 - do NOT write new tests
    - Run preservation property tests from task 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in chat API)
    - Verify message validation, AI responses, and error formats work identically

---

## Category 3: Error Handling in Dashboard Actions (5 bugs)

- [ ] 7. Write bug condition exploration test for dashboard error handling
  - **Property 1: Bug Condition** - Silent Error Handling in Dashboard Actions
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples showing functions return undefined instead of throwing
  - **Scoped PBT Approach**: Test all 5 dashboard action functions with mocked database errors
  - Test getAllPlaygroundForUser(): mock database error, verify it returns undefined instead of throwing
  - Test createPlayground(): mock database error, verify it returns undefined instead of throwing
  - Test deleteProjectById(): mock database error, verify it catches and logs but doesn't throw
  - Test editProjectById(): mock database error, verify it catches and logs but doesn't throw
  - Test duplicateProjectById(): mock database error, verify it returns undefined instead of throwing
  - Run tests on UNFIXED code with mocked Prisma errors
  - **EXPECTED OUTCOME**: Tests FAIL showing undefined returns and silent failures (this is correct - it proves errors are swallowed)
  - Document counterexamples for each function (e.g., "getAllPlaygroundForUser() returns undefined when database is unreachable")
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10_

- [ ] 8. Write preservation property tests for dashboard operations (BEFORE implementing fix)
  - **Property 2: Preservation** - Dashboard Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful dashboard operations
  - Test toggleStarMarked(): verify StarMark record created/deleted, dashboard path revalidated
  - Test getAllPlaygroundForUser(): verify correct query includes (user, Starmark)
  - Test createPlayground(): verify playground created with provided data
  - Test deleteProjectById(): verify playground deleted, path revalidated
  - Test editProjectById(): verify playground updated, path revalidated
  - Test duplicateProjectById(): verify playground copied with "(Copy)" suffix
  - Write property-based tests capturing these dashboard operation patterns
  - Generate random playground data and verify operations produce correct database mutations
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline dashboard behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.9, 3.10, 3.11_

- [ ] 9. Fix error handling in dashboard actions

  - [ ] 9.1 Replace silent error handling with explicit throws
    - In getAllPlaygroundForUser(): Replace `console.log(error);` with `throw error;`
    - In createPlayground(): Replace `console.log(error);` with `throw error;`
    - In deleteProjectById(): Replace `console.log(error);` with `throw error;`
    - In editProjectById(): Replace `console.log(error);` with `throw error;`
    - In duplicateProjectById(): Replace `console.error("Error duplicating project:", error);` with `throw error;`
    - Verify all catch blocks now propagate errors to caller
    - _Bug_Condition: isBugCondition(input) where input.filePath IN dashboardActionsFiles AND input.returnsUndefinedOnError_
    - _Expected_Behavior: All database errors are thrown to caller, enabling UI error handling and user feedback_
    - _Preservation: All successful operations (create, delete, edit, duplicate, toggle star, get all) produce identical database mutations and path revalidations_
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 3.9, 3.10, 3.11_

  - [ ] 9.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Explicit Error Propagation
    - **IMPORTANT**: Re-run the SAME test from task 7 - do NOT write a new test
    - The test from task 7 encodes the expected behavior (errors are thrown)
    - When this test passes, it confirms error propagation works correctly
    - Run tests with mocked database errors on FIXED code
    - **EXPECTED OUTCOME**: Tests PASS showing errors are thrown and catchable (confirms error propagation)
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ] 9.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Dashboard Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 8 - do NOT write new tests
    - Run preservation property tests from task 8
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in dashboard operations)
    - Verify all CRUD operations, star toggling, and path revalidations work identically

---

## Category 4: Error Handling in Playground Actions (3 bugs)

- [ ] 10. Write bug condition exploration test for playground error handling
  - **Property 1: Bug Condition** - Silent Error Handling in Playground Actions
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples showing functions return null/undefined instead of throwing
  - **Scoped PBT Approach**: Test playground action functions with mocked errors and auth failures
  - Test getPlaygroundById(): mock database error, verify it returns undefined instead of throwing
  - Test SaveUpdatedCode() auth failure: call without authenticated user, verify it returns null instead of throwing
  - Test SaveUpdatedCode() database error: mock Prisma error, verify it returns null instead of throwing
  - Run tests on UNFIXED code with mocked errors
  - **EXPECTED OUTCOME**: Tests FAIL showing null/undefined returns (this is correct - it proves errors are swallowed)
  - Document counterexamples (e.g., "SaveUpdatedCode() returns null on auth failure, UI cannot distinguish from save failure")
  - Mark task complete when test is written, run, and failures are documented
  - _Requirements: 2.11, 2.12, 2.13_

- [ ] 11. Write preservation property tests for playground operations (BEFORE implementing fix)
  - **Property 2: Preservation** - Playground Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful playground operations
  - Test getPlaygroundById(): verify correct select fields (title, templateFiles.content)
  - Test SaveUpdatedCode() with authenticated user: verify upsert behavior, JSON stringification
  - Write property-based tests capturing these playground operation patterns
  - Generate random playground IDs and code content, verify operations produce correct queries/upserts
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline playground behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.12, 3.13_

- [ ] 12. Fix error handling in playground actions

  - [ ] 12.1 Replace silent error handling with explicit throws
    - In getPlaygroundById(): Replace `console.log(error)` with `throw error;`
    - In SaveUpdatedCode(): Replace `if (!user) return null;` with `if (!user) throw new Error("Authentication required");`
    - In SaveUpdatedCode(): Replace `console.log("SaveUpdatedCode error:", error); return null;` with `throw error;`
    - Verify all error cases now propagate to caller
    - _Bug_Condition: isBugCondition(input) where input.filePath IN playgroundActionsFiles AND input.returnsNullOnError_
    - _Expected_Behavior: All errors (database, authentication) are thrown to caller with clear error messages_
    - _Preservation: All successful operations (get by ID, save code with valid auth) produce identical database queries and upserts_
    - _Requirements: 2.11, 2.12, 2.13, 3.12, 3.13_

  - [ ] 12.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Explicit Error Propagation
    - **IMPORTANT**: Re-run the SAME test from task 10 - do NOT write a new test
    - The test from task 10 encodes the expected behavior (errors are thrown)
    - When this test passes, it confirms error propagation works correctly
    - Run tests with mocked errors on FIXED code
    - **EXPECTED OUTCOME**: Tests PASS showing errors are thrown with proper messages (confirms error propagation)
    - _Requirements: 2.11, 2.12, 2.13_

  - [ ] 12.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Playground Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 11 - do NOT write new tests
    - Run preservation property tests from task 11
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in playground operations)
    - Verify get by ID and save code operations work identically

---

## Category 5: Code Formatting in app/api/template/[id]/route.ts (1 bug)

- [ ] 13. Write bug condition exploration test for code formatting
  - **Property 1: Bug Condition** - Inconsistent Code Formatting
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexample showing formatting inconsistencies
  - **Scoped PBT Approach**: Run Prettier on app/api/template/[id]/route.ts
  - Test that Prettier detects formatting differences (extra blank lines after line 29, after line 35)
  - Run formatter on UNFIXED code
  - **EXPECTED OUTCOME**: Formatter FAILS with suggested changes (this is correct - it proves formatting is inconsistent)
  - Document the specific formatting issues found (e.g., "Extra blank line after params destructuring on line 29")
  - Mark task complete when test is written, run, and issues are documented
  - _Requirements: 2.14_

- [ ] 14. Write preservation property tests for template API (BEFORE implementing fix)
  - **Property 2: Preservation** - Template API Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful template operations
  - Test valid template generation: verify file operations (saveTemplateStructureToJson, readTemplateStructureFromJson)
  - Test response format: verify { success, templateJson } structure
  - Test temporary file cleanup: verify output file deleted after response
  - Test invalid playground ID: verify 404 error response
  - Write property-based tests capturing these template API patterns
  - Generate random playground IDs and verify operations produce correct responses
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline template API behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.14, 3.15, 3.16_

- [ ] 15. Fix code formatting in template API route

  - [ ] 15.1 Apply consistent formatting
    - Remove extra blank line after line 29 (after params destructuring)
    - Remove extra blank line after line 35 (after playground null check)
    - Ensure consistent 2-space indentation throughout
    - Maintain single blank line between logical sections
    - Follow project's established formatting conventions
    - Run Prettier to verify no further changes suggested
    - _Bug_Condition: isBugCondition(input) where input.filePath == "app/api/template/[id]/route.ts" AND input.hasFormattingIssues_
    - _Expected_Behavior: Code formatting is consistent with project style, Prettier reports no changes needed_
    - _Preservation: All template API functionality (generation, validation, cleanup, error responses) produces identical results_
    - _Requirements: 2.14, 3.14, 3.15, 3.16_

  - [ ] 15.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Consistent Code Formatting
    - **IMPORTANT**: Re-run the SAME test from task 13 - do NOT write a new test
    - The test from task 13 encodes the expected behavior (Prettier satisfied)
    - When this test passes, it confirms formatting is consistent
    - Run Prettier on FIXED code
    - **EXPECTED OUTCOME**: Formatter PASSES with no suggestions (confirms formatting consistency)
    - _Requirements: 2.14_

  - [ ] 15.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Template API Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 14 - do NOT write new tests
    - Run preservation property tests from task 14
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in template API)
    - Verify template generation, responses, and cleanup work identically

---

## Category 6: Template Path Configuration in lib/template.ts (1 bug)

- [ ] 16. Write bug condition exploration test for template path configuration
  - **Property 1: Bug Condition** - Incorrect Template Path
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexample showing template path points to non-existent directory
  - **Scoped PBT Approach**: Test getTemplatePath("NEXTJS") and verify directory existence
  - Test that getTemplatePath("NEXTJS") returns "/vibecode-starters/nextjs-new"
  - Test that this directory does NOT exist on the filesystem
  - Attempt to read template files from this path
  - Run filesystem checks on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL with file not found errors (this is correct - it proves the path is incorrect)
  - Document the counterexample (e.g., "ENOENT: no such file or directory '/vibecode-starters/nextjs-new'")
  - Mark task complete when test is written, run, and error is documented
  - _Requirements: 2.15_

- [ ] 17. Write preservation property tests for template configuration (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Template Paths Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for REACT and VANILLA templates
  - Test REACT template: verify getTemplatePath("REACT") returns "/vibecode-starters/react"
  - Test VANILLA template: verify getTemplatePath("VANILLA") returns "/vibecode-starters/vanilla"
  - Test template list: verify all three templates present in templates array
  - Test getTemplateById() for REACT/VANILLA: verify template structure loads correctly
  - Write property-based tests capturing these template configuration patterns
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline template configuration to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.17, 3.18, 3.19_

- [ ] 18. Fix template path configuration

  - [ ] 18.1 Correct the NEXTJS template path
    - Verify "/vibecode-starters/nextjs" directory exists on filesystem
    - Change NEXTJS path in templatePaths from "/vibecode-starters/nextjs-new" to "/vibecode-starters/nextjs"
    - Verify getTemplatePath("NEXTJS") now returns correct path
    - Test template file loading from corrected path
    - _Bug_Condition: isBugCondition(input) where input.filePath == "lib/template.ts" AND input.hasIncorrectTemplatePath_
    - _Expected_Behavior: NEXTJS template path points to existing directory, template files load successfully_
    - _Preservation: REACT and VANILLA template paths remain unchanged, all template metadata and structure loading work identically_
    - _Requirements: 2.15, 3.17, 3.18, 3.19_

  - [ ] 18.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Template Path
    - **IMPORTANT**: Re-run the SAME test from task 16 - do NOT write a new test
    - The test from task 16 encodes the expected behavior (directory exists, files readable)
    - When this test passes, it confirms template path is correct
    - Run filesystem checks on FIXED code
    - **EXPECTED OUTCOME**: Tests PASS showing directory exists and files are readable (confirms path correction)
    - _Requirements: 2.15_

  - [ ] 18.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Template Paths Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 17 - do NOT write new tests
    - Run preservation property tests from task 17
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in REACT/VANILLA templates)
    - Verify REACT and VANILLA template paths and loading work identically

---

## Final Checkpoint

- [ ] 19. Comprehensive verification - Ensure all tests pass
  - Run full test suite covering all 6 bug categories
  - Verify TypeScript compilation succeeds for auth.ts without @ts-ignore
  - Verify ESLint passes for chat API with no unused import warnings
  - Verify all dashboard actions throw errors on failure
  - Verify all playground actions throw errors on failure
  - Verify Prettier passes for template route with no suggestions
  - Verify NEXTJS template loads correctly from corrected path
  - Verify all preservation tests pass (authentication, chat API, dashboard ops, playground ops, template API, template config)
  - Run integration tests for full flows (auth, dashboard CRUD, playground operations, template generation)
  - Ask user if any questions or issues arise before marking complete
