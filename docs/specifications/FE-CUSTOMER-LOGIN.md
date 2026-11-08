# Customer login FE

Route: `/login-customer`. Uses the shared email/password LoginForm and AuthLayout with a link to `/register-customer`. `/login` remains the employee entry.

## Contract and decisions

Updated 2026-11-08 following user correction and verified against BE `docs/contracts/customer-login.md`: POST `/api/v1/auth/login` accepts email/password for customers and employees. The former phone-based `/auth/customer-login` endpoint has been removed by BE.

- Reuse loginSchema: trimmed email, valid format, max 320 characters; password preserved, 1-100 characters.
- Direct fetch keeps credentials outside Redux and RTK Query cache. Existing generation guards, token storage, `/auth/me`, refresh and logout remain in use.
- Success and existing sessions go to `/app/dashboard`. Backend enforces permissions.
- Registration entry and return navigation use `/register-customer` and `/login-customer`.
- Old customer login draw.io is a historical phone-login reference, superseded by this email-login decision.
