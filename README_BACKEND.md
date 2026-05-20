# Backend Integration Guide

This project is currently a **Static Frontend Prototype**. It uses a "Backend API Shell" (`src/lib/api.ts`) to simulate a live database using browser LocalStorage and mock data.

This document explains how a developer can easily connect this frontend to a real backend (e.g., Supabase, Firebase, Node.js, Python/Django).

## 1. Environment Variables

Create a `.env` file in the root of the project (copy `.env.example` to start). You will need to define your backend endpoints and keys here. Vite uses `import.meta.env.VITE_VAR_NAME` to access these.

## 2. The API Shell (`src/lib/api.ts`)

All data fetching and mutations happen in one centralized file: `src/lib/api.ts`.
**You do not need to rewrite the React components (UI).**

To connect your real database:
1. Open `src/lib/api.ts`.
2. Find the function you want to wire up (e.g., `fetchReviews()`).
3. Comment out or delete the local mock logic.
4. Uncomment the `REAL BACKEND EXAMPLE` block and replace it with your actual `fetch()` call, Supabase client call, or Firebase SDK call.

### Examples by Platform:

**If using Supabase:**
```typescript
import { supabase } from './supabaseClient';

export async function fetchReviews() {
  const { data, error } = await supabase.from('reviews').select('*');
  if (error) throw error;
  return data;
}
```

**If using Firebase / Firestore:**
```typescript
import { collection, getDocs } from "firebase/firestore"; 
import { db } from "./firebase";

export async function fetchReviews() {
  const snapshot = await getDocs(collection(db, "reviews"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**If using a custom Node/Python backend (REST API):**
```typescript
export async function fetchReviews() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/reviews`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}
```

## 3. Data Types & Interfaces

Strict TypeScript interfaces are defined at the top of `src/lib/api.ts`:
- `Review`
- `QuoteRequest`
- `SiteSettings`
- `AdminUser`

Ensure your database schema matches these interfaces, or adjust the interfaces to match your database.

## 4. Admin Dashboard & Authentication

The Admin Dashboard is located in `src/pages/Admin.tsx`. It currently relies on a hardcoded password check for prototype purposes.

To secure this:
1. Wire up `loginAdmin()` and `checkAuthStatus()` in `src/lib/api.ts` to use your real authentication provider (JWT, Supabase Auth, Firebase Auth).
2. Protect your API routes. All functions in `api.ts` that modify data (create, update, delete) have comments showing where to pass an `Authorization` header containing the admin token.

## 5. Developer Handoff Checklist

Before going live with a real backend, ensure you have:

- [ ] Created a `.env` file with production API URLs and keys.
- [ ] Replaced mock logic in `src/lib/api.ts` with real database calls.
- [ ] Implemented a secure backend authentication system (JWT, Session, etc.).
- [ ] Updated `loginAdmin()` in `src/lib/api.ts` to return a real auth token.
- [ ] Verified that all `fetch()` calls handle errors properly so the UI doesn't crash (basic try/catch blocks are already provided).
- [ ] Setup email/SMS notifications on the backend when a new `QuoteRequest` is submitted.