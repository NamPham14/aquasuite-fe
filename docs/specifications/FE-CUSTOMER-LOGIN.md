# Customer login FE

Route: `/login` — a single entry for customers and employees (updated 2026-11-26). Uses the shared email/password LoginForm and AuthLayout with a link to `/register-customer`. The legacy `/login-customer` URL redirects to `/login`.

## Contract and decisions

Updated 2026-11-08 following user correction and verified against BE `docs/contracts/customer-login.md`: POST `/api/v1/auth/login` accepts email/password for customers and employees. The former phone-based `/auth/customer-login` endpoint has been removed by BE.

- Reuse loginSchema: trimmed email, valid format, max 320 characters; password preserved, 1-100 characters.
- Direct fetch keeps credentials outside Redux and RTK Query cache. Existing generation guards, token storage, `/auth/me`, refresh and logout remain in use.
- After login (and for existing sessions hitting `/login`), routing is by role: customer-only accounts go to `/storefront`, employees go to `/app/dashboard`. Employees may still open the public storefront (header link "Cửa hàng" in ManagementLayout). Backend enforces permissions.
- Registration entry and return navigation use `/register-customer` and `/login`.
- Old customer login draw.io is a historical phone-login reference, superseded by this email-login decision.
