# FORK Android and Google Play release

FORK's Android app is a Trusted Web Activity (TWA) backed by the production web app at
`https://fork-financial-intelligence.vercel.app`. The Android package ID is
`com.forkfinancial.app` and the generated project targets Android API 36.

## Build prerequisites

- Bubblewrap CLI 1.27 or newer
- JDK 17
- Android SDK with API 36
- A private Android upload keystore at `android.keystore` in the repository root (ignored by Git)
- The keystore alias `fork-upload`

Bubblewrap's managed JDK and Android SDK are installed under `~/.bubblewrap/` on the development
Mac. Never commit a keystore or its password. Back up the keystore and password separately in a
password manager because future updates must be signed consistently.

## Build the signed bundle

From the `android` directory, run:

```bash
npx --yes @bubblewrap/cli build
```

The first build can create the missing keystore. Choose a strong unique password and save it in a
password manager. The Play Console upload artifact is the generated `.aab`, not the `.apk`.

## Website ownership verification

The fullscreen TWA requires `/.well-known/assetlinks.json` on the production website. Add both the
local upload certificate fingerprint and the Google Play App Signing fingerprint after the app is
created in Play Console. Until verification succeeds, Android safely opens the site as a Custom
Tab with browser UI.

## Play Console checklist

1. Create the app as **FORK — Financial Clarity** using package ID `com.forkfinancial.app`.
2. Upload the signed Android App Bundle to Internal testing first.
3. Add the Play App Signing SHA-256 fingerprint to `assetlinks.json` and redeploy the website.
4. Provide a working privacy policy and account-deletion URL, both accessible without login.
5. Complete Data safety accurately for Auth0, Tiger Data/PostgreSQL, Plaid, Gemini, and ElevenLabs.
6. Complete the Financial features declaration; FORK provides financial planning/advice tools.
7. Provide reviewer credentials and instructions because production mode requires authentication.
8. Complete content rating, target audience, ads, app access, and store-listing declarations.
9. If the developer account is a personal account created after November 13, 2023, run a closed
   test with at least 12 continuously opted-in testers for at least 14 days before applying for
   production access.

FORK must remain clearly described as an estimate and planning tool, not a bank, lender, broker, or
fiduciary. Plaid is still configured for Sandbox and must not be represented as supporting live bank
connections until Plaid production access is approved and configured.
