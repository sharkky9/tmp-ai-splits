# AI Splits - Product Tech Stack

This document outlines the chosen technology stack for the AI Splits project.

## 1. Frontend

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (with Shadcn/ui for pre-built, composable components)
*   **State Management:**
    *   React Context API (for simple global state like authentication status)
    *   React Query (TanStack Query) (for server state management, caching, and data synchronization with Supabase)
*   **Form Handling:** React Hook Form
*   **Data Fetching Client:** `supabase-js` (for direct interaction with Supabase)
*   **Hosting:** Vercel

## 2. Backend (Backend-as-a-Service - BaaS)

*   **Platform:** Supabase
    *   **Database:** PostgreSQL (managed by Supabase)
    *   **Authentication:** Supabase Auth
    *   **Serverless Logic:** Supabase Edge Functions (Deno/TypeScript) - *This will be where OpenAI API calls and other custom backend logic like debt simplification are implemented.*

## 3. Large Language Model (LLM) Integration

*   **Provider:** OpenAI API
*   **Interaction:** Via Supabase Edge Functions using the official `openai` Node.js/TypeScript library. API keys will be stored securely as environment variables in Supabase.

## 4. Key Utility Libraries

*   **Currency:** `decimal.js` (for accurate handling of monetary values)
*   **Date Handling:** `date-fns` (for date parsing, formatting, and manipulation)
*   **IDs:** `uuid` (for client-side generation of unique identifiers if needed prior to database insertion)

## 5. Testing

*   **Unit/Integration Tests:** Jest
*   **Component Tests:** React Testing Library (used with Jest)
*   **Supabase Edge Function Tests:** Local Deno testing environment.

## 6. Code Quality & Development Workflow

*   **Linter:** ESLint
*   **Formatter:** Prettier
*   **Git Hooks:** Husky (to automate linting/formatting on commit)
*   **Version Control:** Git (hosted on a platform like GitHub)

## 7. API Key Management

*   **OpenAI API Key:** Stored as a secret environment variable within Supabase project settings, accessible only by Supabase Edge Functions.
*   **Supabase Keys:**
    *   `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public) stored as environment variables in Vercel for the Next.js frontend.

This stack is chosen to facilitate rapid development, scalability, and a modern developer experience. 