# VMIND Platform Authentication: Strategic Roadmap & Architectural Analysis

## Executive Summary

Following a deep architectural audit, extensive technical discussion, and tracking across the latest `develop` merges (including commits `e5fc207` and `fdefc8c` on September 16–17, 2026), this document outlines:
1. **The current status** of the VMIND authentication and session model.
2. **What was successfully fixed or enhanced** in recent updates.
3. **The critical security vulnerabilities that still remain** and what we must do to close them.
4. **Alternative architectural approaches** (Stateless JWT vs. HttpOnly Cookies vs. Redis-Backed Sessions).
5. **What we should consider next** for production readiness, scalability, and threat mitigation.

---

## 1. Current Audit Status: What Changed vs. What Remains

### ✅ Resolved & Hardened in Recent Merges (Up to Sept 17, 2026):
- **Admin Management Endpoints Protected (Commit `fdefc8c`)**:
  - `GET /api/auth/vmind/signup-requests`, `POST /approve-request`, `POST /reject-request`, and `POST /toggle-user-status` are now strictly guarded by `authorize(['Administrator'])` middleware in `src/authEndpoints.ts`.
- **`current_password` Verification on Profile Updates (Commit `e5fc207`)**:
  - `PUT /api/auth/vmind/profile` now requires `current_password`, hashes it with the user's stored salt via PBKDF2 (100,000 iterations), and validates it against `password_hash` before allowing password changes.
- **Multi-Tier Rate Limiting (Commit `e5fc207`)**:
  - Introduced `src/rateLimiter.ts` using `express-rate-limit`:
    - `authBruteForceLimiter`: 15 requests / 15 minutes per IP on `/login`, `/forgot-password`, and `/verify-code`.
    - `registrationLimiter`: 5 requests / hour per IP on `/signup-request`.
    - `passwordCheckLimiter`: 60 requests / minute per IP on `/profile` and `/verify-current-password`.
    - `apiAuthGeneralLimiter`: 120 requests / 15 minutes per IP on general auth routes.
- **Cryptographically Secure Password Reset PINs (Commit `e5fc207`)**:
  - Replaced predictable `Math.random()` in `POST /forgot-password` with Node's native `crypto.randomBytes(6)` alphanumeric generation.
- **Frontend Session Timeout Resilience & Sidebar Auth**:
  - Attached `Authorization: Bearer ${validToken}` to the signup-requests badge query in `ManagementSidebar.tsx`.
  - Upgraded `SessionTimeoutProvider.tsx`'s global 401 interceptor to verify token expiration before triggering an automatic logout, preventing false-positive logout loops when sub-widgets encounter permission checks.
- **Developer Bypasses & Backdoors Eliminated**:
  - `host:host123` hardcoded bypass in `src/auth.ts` deleted.
  - `ENABLE_DEV_BYPASS` and `bypass_user` fallback logic removed from `src/server-http.ts`.
- **Roles Array Normalization Patched**:
  - In `src/auth-middleware.ts`, incoming user roles are normalized (`Array.isArray(rawRoles) ? rawRoles : [rawRoles]`), preventing runtime exceptions during role checks.
- **Cloudflare Turnstile Shared & Enforced**:
  - Anti-bot validation enforced across login, signup, and password reset flows.

---

### ⚠️ Critical Security Gaps Remaining:

#### 1. MCP Server HTTP Endpoint Accepts Expired Tokens (`src/server-http.ts:L181, L260`)
```typescript
// src/server-http.ts
userContext = jwt.verify(activeToken, JWT_SECRET, { ignoreExpiration: true });
```
- **The Risk**: Any token ever generated in the past — even if expired weeks or months ago — is accepted indefinitely by the `/mcp` HTTP endpoint to execute backend SQL database tools.
- **Action Required**: Remove `{ ignoreExpiration: true }` so expired tokens are strictly rejected with HTTP 401.

#### 2. The 30-Day Stateless JWT Shortcut & "Remember Me" Anti-Pattern (`src/authEndpoints.ts:L872`)
```typescript
// src/authEndpoints.ts
const token = jwt.sign(payload, JWT_SECRET, { 
  expiresIn: rememberMe ? '30d' : '12h' 
});
```
Stored directly in the browser's `localStorage` (`app/login/page.tsx:L712`):
```typescript
localStorage.setItem('vmind_session', data.token);
```
- **Zero Server-Side Kill Switch**: Because the JWT is purely stateless, once signed, the server cannot invalidate it. If an employee is fired, an account is deactivated by an admin, or the user clicks "Déconnexion", the token remains 100% valid until the 30 days expire.
- **Vulnerable to XSS Exfiltration**: Any XSS vulnerability on any page allows malicious scripts to read `localStorage.getItem('vmind_session')` and gain a **full month of permanent, unrevokable API access** as that user.
- **Lack of Session Tracking**: The backend has zero visibility into how many active devices or sessions a user has.

#### 3. Database Attempt Counter for Reset PINs
- While IP rate limiting is now active via `authBruteForceLimiter`, the database does not track per-code failed attempts. A distributed attacker across multiple IPs could still attempt brute-force guesses against an active 15-minute PIN without invalidating the code.

---

### 🏛️ The Correct "Remember Me" Architecture: Dual Token (Access + Refresh Token Rotation)

The industry-standard implementation requires splitting credentials into two distinct tokens:

```
+---------------------------------------------------------------------------------------+
|                               PROPER "REMEMBER ME" ARCHITECTURE                       |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  [ Client / Browser ]                                      [ Backend API / DB ]       |
|                                                                                       |
|  1. POST /login (with rememberMe = true/false)                                        |
|     ---------------------------------------------------->  Verify password            |
|                                                            Generate:                  |
|                                                            - Access Token (15m JWT)   |
|                                                            - Refresh Token (UUID/hash)|
|                                                            Store Refresh Token in DB  |
|                                                                                       |
|  2. Response:                                                                         |
|     <----------------------------------------------------                             |
|     - Body: { token: "<15m-jwt>", user: {...} }                                       |
|     - Set-Cookie: refresh_token=<uuid>; HttpOnly; Secure; SameSite=Lax;               |
|       Max-Age=(rememberMe ? 30 days : Session);                                       |
|                                                                                       |
|  3. Subsequent API Requests:                                                         |
|     Header: Authorization: Bearer <15m-jwt>                Stateless fast auth        |
|                                                                                       |
|  4. When Access Token Expires (HTTP 401):                                             |
|     POST /api/auth/refresh (Cookie sent automatically) --> Validate Refresh Token     |
|                                                            in DB/Redis (Check revoked)|
|                                                            Rotate Refresh Token       |
|     <----------------------------------------------------  Issue new 15m Access Token |
|                                                                                       |
|  5. On Logout or User Deactivation:                                                   |
|     POST /api/auth/logout                                                              |
|     ---------------------------------------------------->  DELETE Refresh Token in DB |
|                                                            Clear HttpOnly Cookie      |
|                                                            (Access dies in <= 15 min) |
+---------------------------------------------------------------------------------------+
```

- **Access Token**: Short-lived (10–15 minutes), passed in the `Authorization: Bearer` header. Kept in memory (React state) or short-term storage.
- **Refresh Token**: Long-lived (30 days if "Remember Me" is checked, session-only if unchecked), stored **strictly inside an `HttpOnly`, `Secure`, `SameSite=Lax` Cookie** (inaccessible to JavaScript, immune to XSS theft).
- **Server-Side Revocation (PostgreSQL or Redis)**: The refresh token ID/hash is stored in the database (`vmind_refresh_tokens`). When an admin deactivates an account or the user logs out, the refresh token is immediately deleted, killing the session permanently within 15 minutes.
- **Refresh Token Rotation & Reuse Detection**: Every time a refresh token is used to obtain a new access token, a new refresh token is issued and the old one is invalidated. If an invalidated refresh token is ever presented again, the server assumes token theft and immediately revokes the entire token family.

---

## 2. Updated Priority Action Matrix

| Priority | Feature / Vulnerability | Status | Owner / Commit | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **P1** | **Protect Admin Endpoints** (`/signup-requests`, `/approve-request`, etc.) | ✅ **DONE** | Ahmed (`fdefc8c`) | Secured with `authorize(['Administrator'])` |
| **P2** | **Enforce `current_password` on Profile Updates** (`PUT /profile`) | ✅ **DONE** | Ahmed (`e5fc207`) | PBKDF2 hash check + `passwordCheckLimiter` |
| **P3** | **Anti-Brute Force Rate Limiting** | ✅ **DONE** | Ahmed (`e5fc207`) | Added `src/rateLimiter.ts` across auth endpoints |
| **P4** | **Cryptographic Reset PINs** | ✅ **DONE** | Ahmed (`e5fc207`) | Replaced `Math.random()` with `crypto.randomBytes(6)` |
| **P5** | **Remove `{ ignoreExpiration: true }` from MCP Server** | 🚨 **ACTIVE** | *Pending* | In `src/server-http.ts:L181, L260`. Must be removed. |
| **P6** | **Database Counter for Failed Reset PIN Attempts** | 🟡 **PENDING** | *Pending* | Invalidate code in DB after 5 consecutive failed attempts. |
| **P7** | **Replace 30-Day Floating JWT with Refresh Token Rotation** | 🟡 **NEXT PHASE** | *Pending* | Implement `/refresh` + `HttpOnly` Cookie. |

---

## 3. Session Architectural Approaches (Trade-Off Analysis)

| Dimension | Approach A: Stateless JWT *(Current)* | Approach B: HttpOnly Cookies *(XSS Immune)* | Approach C: Redis-Backed Sessions *(Enterprise Hybrid)* |
| :--- | :--- | :--- | :--- |
| **Token Storage** | `localStorage` (12h or 30d) | Browser `HttpOnly` Cookie | Cookie / Header referencing Redis key |
| **XSS Defense** | ⚠️ Susceptible to token exfiltration | 🛡️ **Immune**: JS cannot read cookie | 🛡️ **Immune** (if in HttpOnly cookie) |
| **CSRF Defense** | 🛡️ Immune by default (Custom header) | ⚠️ Requires `SameSite=Lax` or CSRF token | ⚠️ Requires CSRF defense |
| **Server Overhead** | 🚀 Zero DB queries (Pure CPU math) | 🚀 Zero DB queries (Pure CPU math) | ⚡ Very low (<1ms Redis lookup) |
| **Instant Revocation** | ❌ None (Wait for 12h–30d expiry) | ❌ None (Wait for expiry) | ✅ **Instant** (`redis.del(sessionId)`) |
| **Cross-Origin Complexity** | 🟢 Zero (Simple CORS headers) | 🟡 Moderate (Requires `credentials: 'include'`) | 🟡 Moderate |
| **Implementation Effort** | 🟢 Completed (Hardened) | 🟡 1–2 days | 🔴 3–4 days |

### Strategy Recommendation:
1. **Immediate Step**: Fix **Priority 5** (`src/server-http.ts` remove `{ ignoreExpiration: true }`).
2. **Session Lifespan Cap**: For "Remember Me", adopt the standard **Refresh Token pattern** (short 15-minute access token + 30-day refresh token) rather than a 30-day floating bearer JWT in `localStorage`.
3. **Phase 2 (Production Launch)**: Migrate to **Approach B (HttpOnly Cookies)** once frontend and backend share the unified domain (e.g., `app.vmind.io` and `api.vmind.io`), permanently closing the XSS exfiltration vector.

---

## 4. What We Shall Consider Next

### 1. Centralized Frontend API Client (`apiClient.ts`)
Replace scattered `fetch()` calls and duplicate helper scripts with a unified API client:
- Automatically attaches the `Authorization: Bearer <token>` header.
- Safely handles `401 Unauthorized` responses without triggering circular logout loops.

### 2. User Deactivation Cache in Redis (Instant Revocation without Full Sessions)
If instant user deactivation is required before building full refresh token rotation:
- Keep stateless JWTs for general performance.
- When an admin deactivates a user, execute: `redis.set('deactivated:' + username, '1', { ex: 2592000 })` (30-day TTL).
- In `auth-middleware.ts`, verify the key doesn't exist before granting access.

### 3. Content Security Policy (CSP) Headers
Configure a strict Content Security Policy in `next.config.mjs` to block inline script injection and restrict external network destinations, preventing stolen credentials from reaching external servers.

### 4. Admin Audit Logging
Add a database audit table (`vmind_admin_audit_logs`) tracking which administrator approved, rejected, or modified user accounts, with IP address and timestamp.
