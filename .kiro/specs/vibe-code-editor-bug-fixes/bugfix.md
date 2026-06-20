# Bugfix Requirements Document

## Introduction

The vibe-code-editor system has multiple bugs affecting configuration, type safety, code quality, template path configuration, and error handling. These bugs impact database connectivity, authentication, template loading, and general system reliability. The AI suggestions/code-completion functionality (app/api/code-completion/route.ts and modules/playground/hooks/useAISuggestion.tsx) is excluded from this bugfix as it will be changed entirely in a separate effort.

## Bug Analysis

### Current Behavior (Defect)

**1. Prisma Configuration Issues**

1.1 WHEN the Prisma client generator is configured with provider "prisma-client" THEN the system uses an incorrect generator name that should be "prisma-client-js"

1.2 WHEN the Prisma datasource is configured without a DATABASE_URL THEN the system has an incomplete datasource configuration missing the required url field

**2. Type Safety Suppressions**

1.3 WHEN creating a new user account in auth.ts signIn callback THEN the system uses @ts-ignore to suppress type errors in the accounts.create nested operation (line 28)

1.4 WHEN creating an existing user account in auth.ts signIn callback THEN the system uses @ts-ignore to suppress type errors for the sessionState field (line 66)

**3. Unused Imports**

1.5 WHEN app/api/chat/route.ts is loaded THEN the system imports "error from console" on line 2 which is never used in the code

**4. Error Handling - Dashboard Actions**

1.6 WHEN getAllPlaygroundForUser() encounters a database error THEN the system logs the error and returns undefined instead of throwing or returning an error object

1.7 WHEN createPlayground() encounters a database error THEN the system logs the error and returns undefined instead of throwing or returning an error object

1.8 WHEN deleteProjectById() encounters a database error THEN the system logs the error and returns undefined, silently failing without notifying the caller

1.9 WHEN editProjectById() encounters a database error THEN the system logs the error and returns undefined, silently failing without notifying the caller

1.10 WHEN duplicateProjectById() encounters a database error THEN the system logs the error and returns undefined instead of throwing or returning an error object

**5. Error Handling - Playground Actions**

1.11 WHEN getPlaygroundById() encounters a database error THEN the system logs the error and returns undefined instead of throwing or returning an error object

1.12 WHEN SaveUpdatedCode() is called without an authenticated user THEN the system returns null without logging or throwing an error

1.13 WHEN SaveUpdatedCode() encounters a database error THEN the system logs the error and returns null instead of throwing or returning an error object

**6. Code Formatting**

1.14 WHEN reviewing app/api/template/[id]/route.ts THEN the system has inconsistent spacing and formatting issues (extra blank lines, inconsistent indentation)

**7. Template Path Configuration**

1.15 WHEN a user creates or loads a NEXTJS playground THEN the system attempts to load from "/vibecode-starters/nextjs-new" which does not exist, causing template loading failures

### Expected Behavior (Correct)

**1. Prisma Configuration Issues**

2.1 WHEN the Prisma client generator is configured THEN the system SHALL use provider "prisma-client-js" as the correct generator name

2.2 WHEN the Prisma datasource is configured THEN the system SHALL include url = env("DATABASE_URL") to properly reference the database connection string

**2. Type Safety Suppressions**

2.3 WHEN creating a new user account in auth.ts signIn callback THEN the system SHALL properly type the nested accounts.create operation without @ts-ignore suppressions

2.4 WHEN creating an existing user account in auth.ts signIn callback THEN the system SHALL properly type the sessionState field without @ts-ignore suppressions

**3. Unused Imports**

2.5 WHEN app/api/chat/route.ts is loaded THEN the system SHALL NOT import unused modules like "error from console"

**4. Error Handling - Dashboard Actions**

2.6 WHEN getAllPlaygroundForUser() encounters a database error THEN the system SHALL throw the error to be handled by the caller

2.7 WHEN createPlayground() encounters a database error THEN the system SHALL throw the error to be handled by the caller

2.8 WHEN deleteProjectById() encounters a database error THEN the system SHALL throw the error to be handled by the caller

2.9 WHEN editProjectById() encounters a database error THEN the system SHALL throw the error to be handled by the caller

2.10 WHEN duplicateProjectById() encounters a database error THEN the system SHALL throw the error to be handled by the caller

**5. Error Handling - Playground Actions**

2.11 WHEN getPlaygroundById() encounters a database error THEN the system SHALL throw the error to be handled by the caller

2.12 WHEN SaveUpdatedCode() is called without an authenticated user THEN the system SHALL throw an error indicating authentication is required

2.13 WHEN SaveUpdatedCode() encounters a database error THEN the system SHALL throw the error to be handled by the caller

**6. Code Formatting**

2.14 WHEN reviewing app/api/template/[id]/route.ts THEN the system SHALL have consistent spacing, indentation, and formatting following the project's code style

**7. Template Path Configuration**

2.15 WHEN a user creates or loads a NEXTJS playground THEN the system SHALL load from "/vibecode-starters/nextjs" which is the correct directory name

### Unchanged Behavior (Regression Prevention)

**1. Prisma Schema**

3.1 WHEN the Prisma schema defines models (User, Account, Playground, etc.) THEN the system SHALL CONTINUE TO maintain all existing model definitions, relationships, and field mappings

3.2 WHEN the Prisma datasource uses MongoDB THEN the system SHALL CONTINUE TO use "mongodb" as the provider

**2. Authentication Flow**

3.3 WHEN a user signs in and already exists THEN the system SHALL CONTINUE TO link the account properly

3.4 WHEN a user signs in for the first time THEN the system SHALL CONTINUE TO create both the user and account records

3.5 WHEN JWT tokens are created THEN the system SHALL CONTINUE TO include user role and profile information

3.6 WHEN sessions are created THEN the system SHALL CONTINUE TO attach user ID and role to the session

**3. Chat API Functionality**

3.7 WHEN the chat API receives a message with history THEN the system SHALL CONTINUE TO generate AI responses using the same logic and prompt structure

3.8 WHEN the chat API validates input THEN the system SHALL CONTINUE TO validate message format and history structure

**4. Dashboard Operations**

3.9 WHEN toggleStarMarked() succeeds THEN the system SHALL CONTINUE TO return success status and revalidate the dashboard path

3.10 WHEN a playground is created successfully THEN the system SHALL CONTINUE TO return the created playground object

3.11 WHEN a playground is duplicated successfully THEN the system SHALL CONTINUE TO copy all properties and append "(Copy)" to the title

**5. Playground Operations**

3.12 WHEN getPlaygroundById() succeeds THEN the system SHALL CONTINUE TO return the playground with title and templateFiles

3.13 WHEN SaveUpdatedCode() succeeds THEN the system SHALL CONTINUE TO upsert the template file and return the updated record

**6. Template API**

3.14 WHEN the template API generates a template JSON THEN the system SHALL CONTINUE TO validate the JSON structure before returning

3.15 WHEN the template API completes successfully THEN the system SHALL CONTINUE TO clean up temporary output files

**7. AI Code Completion (Excluded from Fix)**

3.16 WHEN the code completion API is called THEN the system SHALL CONTINUE TO operate with its current implementation unchanged (will be redesigned separately)

3.17 WHEN the useAISuggestion hook is used THEN the system SHALL CONTINUE TO operate with its current implementation unchanged (will be redesigned separately)

**8. Template Paths**

3.18 WHEN a user creates or loads a REACT playground THEN the system SHALL CONTINUE TO load from "/vibecode-starters/react-ts"

3.19 WHEN a user creates or loads an EXPRESS playground THEN the system SHALL CONTINUE TO load from "/vibecode-starters/express-simple"

3.20 WHEN a user creates or loads a VUE playground THEN the system SHALL CONTINUE TO load from "/vibecode-starters/vue"

3.21 WHEN a user creates or loads a HONO playground THEN the system SHALL CONTINUE TO load from "/vibecode-starters/hono-nodejs-starter"

3.22 WHEN a user creates or loads an ANGULAR playground THEN the system SHALL CONTINUE TO load from "/vibecode-starters/angular"
