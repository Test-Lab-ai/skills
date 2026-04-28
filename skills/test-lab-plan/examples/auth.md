# Auth flow templates

Adapt these for any auth surface. Each block is paste-ready into the test-lab.ai dashboard. Replace bracketed placeholders, keep `{{credentials.x}}` references intact.

These templates favor patterns over fixtures (e.g., "a user menu is visible" rather than "the text 'alice' is shown"). When the user's app has a fixed text element to assert on, swap the pattern for the literal.

---

## Login — happy path

**Mode:** Quick · **Agent:** Functional · **Assumes credentials:** `loginEmail`, `loginPassword`

```
Pre-condition: user is logged out.

Go to /login.

Enter the email {{credentials.loginEmail}} and the password {{credentials.loginPassword}}.

Click the "Sign in" button.

Verify that:
1. The browser navigates away from /login (typically to /dashboard, /home, or /).
2. A user menu, avatar, or "Sign out" control is visible in the page header.
3. The header shows text matching the logged-in user's email or display name.
4. No error banner is shown at the top of the page.
```

---

## Login — wrong password (sad path)

**Mode:** Quick · **Agent:** Functional · **Assumes credentials:** `loginEmail`

```
Pre-condition: user is logged out.

Go to /login.

Enter the email {{credentials.loginEmail}} and the password "deliberately-wrong-password-1234!".

Click the "Sign in" button.

Verify that:
1. The browser stays on /login (no redirect to a logged-in surface).
2. An error message about invalid credentials is visible near the form.
3. The error does not reveal whether the email exists in the system (no "user not found" or "email not registered" wording).
4. The password field is empty or the form is in an "error" state ready for retry.
```

---

## Signup — happy path

**Mode:** Quick · **Agent:** Functional

```
Pre-condition: user is logged out.

Go to /signup.

Fill the form with:
- Email: a unique address using the pattern test-{timestamp}@example.com
- Password: TestPassword123!
- Confirm password: TestPassword123! (only if the form has this field)

Submit the form.

Verify that one of the following happens:
1. The page shows a "check your email to verify" message, OR
2. The browser redirects to a logged-in surface (typically /dashboard, /onboarding, or /welcome), OR
3. A success banner indicates the account was created.

Verify that:
4. No error message is shown at any point during submission.
5. The form does not stay in an unsubmitted state (no spinner stuck indefinitely).
```

---

## Forgot password

**Mode:** Quick · **Agent:** Functional · **Assumes credentials:** `loginEmail`

```
Pre-condition: user is logged out.

Go to /forgot-password (or click "Forgot password?" from /login).

Enter the email {{credentials.loginEmail}}.

Submit the form.

Verify that:
1. A confirmation message appears indicating an email has been sent (e.g., "Check your inbox").
2. The message does not reveal whether the email is registered (it should look the same for both registered and unregistered emails — this is a security property).
3. The browser stays on the forgot-password surface or moves to a confirmation surface; it does not redirect to /login or /dashboard.
4. No error banner is shown.
```

---

## Change password (authenticated)

**Mode:** Quick · **Agent:** Functional · **Assumes credentials:** `loginPassword` · **Requires:** logged-in pre-step

```
Pre-condition: user is logged in (configure a login pre-step on this plan; see examples/pipelines.md).

Go to /settings/password (or /account/security).

Fill the password change form with:
- Current password: {{credentials.loginPassword}}
- New password: NewTestPassword456!
- Confirm new password: NewTestPassword456!

Submit the form.

Verify that:
1. A success message appears confirming the password was changed.
2. The form clears or moves to a confirmation state.
3. No error banner is shown.
```

(If you adapt this to actually verify the new password works, run a separate logout-then-login plan after this one — don't bundle the verification into this plan.)

---

## Logout

**Mode:** Quick · **Agent:** Functional · **Requires:** logged-in pre-step

```
Pre-condition: user is logged in (configure a login pre-step on this plan).

Go to any authenticated surface (e.g., /dashboard).

Open the user menu (typically an avatar or initials in the header) and click "Sign out" or "Log out".

Verify that:
1. The browser redirects to /login, /, or a public landing surface.
2. The user menu / avatar is no longer visible in the header.
3. Visiting /dashboard now redirects to /login (the session is fully cleared).
```

---

## Notes for adapting these

- **Path conventions vary.** Swap `/login`, `/signup`, `/forgot-password`, `/dashboard` for whatever the target site uses. If the user's site uses `/sign-in` or `/account/login`, keep the prose natural and use their convention.
- **Field labels vary.** "Email" might be "Username" or "Work email"; "Sign in" might be "Continue" or "Log in". Use the wording from the actual page when known; otherwise the natural-language descriptions above ("the email field", "the sign in button") are flexible enough for the agent to map.
- **MFA / 2FA** is not covered here. If the flow requires a code, the test will fail at that step unless the credential is a TOTP-derived value the credential store can produce — outside the scope of this template set.
- **CAPTCHAs (reCAPTCHA, Cloudflare Turnstile)** can break automated runs. If the target page has one, mention it to the user — they may need to allowlist test-lab.ai's runner IPs or move the protection to a non-test environment.
