# Customer registration

Route: `/register-customer`, under the existing public-only route guard. Entry from `/login-customer`.

Verified on 2026-11-08 against the sibling BE `docs/contracts/registration-sms.md`, `RegisterController`, request DTOs, `RegistrationValidator`, and `RegistrationErrorCode`. No BE changes.

- POST `/api/v1/iam/register`: fullName (trim, 2–50), email (trim, valid, max 320), phone (`0[35789][0-9]{8}`), password, passwordConfirmation, termsAccepted=true. Password whitespace is preserved; 8–72 characters, at most 72 UTF-8 bytes, uppercase/lowercase/number/special character; confirmation must match.
- POST `/api/v1/iam/register/verifications`: email and six-digit OTP. Reuses existing session generation, token storage and `/auth/me` completion before navigating to `/app/dashboard`.
- POST `/api/v1/iam/register/otp-resends`: email. UI cooldown 60 seconds after successful send; backend is authoritative for limits. Pending registration expires five minutes from initial submission; resend does not extend it.
- REG_007 keeps the email verification screen available for resend. REG_003 permits restarting. REG_009 directs to login. Other registration errors appear inline; field errors attach to matching form controls.
- Credentials and OTP go directly through fetch, outside Redux actions/cache. Registration form is cleared when entering verification. No local/session storage of registration data.
- Customer login uses email/password through the shared `/auth/login` endpoint, as confirmed by the updated BE contract. Terms acceptance is required by BE; no policy URL was supplied. A published policy page is outside this change.

Registration and customer login share the existing staff login AuthLayout: blue gradient background, white card, blue buttons and compact typography. Both pages link to each other. Labels, field errors, pending state, duplicate request protection, password visibility, keyboard focus and live status are included.

Verification: lint, build, focused schema/API tests. Live SMTP/API and browser layout checks require a running environment and were not performed.
