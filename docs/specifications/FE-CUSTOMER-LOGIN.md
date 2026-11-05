# Customer login FE

Route: `/login-customer`. Separate phone/password form; `/login` remains email/password.

## Contract and decisions

Verified against sibling backend `docs/contracts/customer-login.md`, `CustomerLoginRequest.java` and `AuthController.java` on 2026-11-05. No backend changes.

- POST `/api/v1/auth/customer-login`: `{phone,password}`. Trim phone; require `0[35789][0-9]{8}`. Preserve password whitespace; reject blank and >100 characters.
- Existing token envelope; reuse shared session generation, sessionStorage, `/auth/me`, refresh and logout. Credentials stay outside Redux actions and mutation cache.
- Backend enforces ACTIVE user and active CUSTOMER role. AUTH_003 covers unknown phone, incorrect password and non-customer accounts; AUTH_008 inactive; AUTH_009 dependency outage.
- Success and existing sessions go to `/app/dashboard`, the existing shared destination. A customer storefront and role-based management restrictions are outside this work item. No OTP, registration or password recovery routes invented.
- Labels, inline validation, alert for service/auth errors, pending submit, duplicate-submit protection, password visibility toggle and mobile layout.

## Wireframe

[Editable draw.io](FE-CUSTOMER-LOGIN.drawio): desktop, mobile and state/flow notes. Open with diagrams.net or draw.io.
