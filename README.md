# For Deborah

## Push notification setup

Web Push requires a matching VAPID public/private key pair. A random value, or a
public key paired with a private key from another generation, cannot sign valid
push requests.

1. Generate one pair locally:

   ```sh
   npm run generate:vapid
   ```

2. Add the generated `publicKey` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the
   generated `privateKey` as `VAPID_PRIVATE_KEY` in the deployment environment.
3. Set `VAPID_SUBJECT` to a contact URI such as `mailto:you@example.com`.
4. Redeploy the application. If a device subscribed using an old public key,
   turn notifications off and back on so the browser creates a new subscription.

Keep the private key secret and stable. Changing either key invalidates existing
subscriptions. The application validates that both configured keys belong to the
same pair before allowing a subscription.
