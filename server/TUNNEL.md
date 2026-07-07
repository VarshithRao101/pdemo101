# Local Multi-Device Tunneling

To test the backend API on other devices (like smartphones, tablets, or remote clients), we use **localtunnel**.

## Why localtunnel?
We chose **localtunnel** because:
1. It requires **zero configuration, registration, or accounts**. Unlike `ngrok`, you don't need to sign up for an account or manage auth tokens.
2. It runs directly as a node utility using `npx localtunnel` or our configured script `npm run tunnel`.
3. It is fully open-source and free.

---

## Steps to Start the Tunnel

1. First, make sure the backend server is running locally on port `5000`:
   ```bash
   cd server
   npm run dev
   ```

2. In a separate terminal session, start the tunnel:
   ```bash
   cd server
   npm run tunnel
   ```

3. The console will print a public URL like:
   ```text
   your url is: https://funny-frogs-sleep.localtunnel.me
   ```

4. **Important**: When visiting the URL in a browser for the first time, you may see a localtunnel landing security page. Click the button to bypass/acknowledge it so requests can pass through successfully.

---

## Pointing the Frontend at the Tunnel

To connect the React frontend (running on Vite) to your tunnel:
1. Open your frontend API configuration (e.g., in a service file or `.env` inside the root directory).
2. Point the base URL of your API services to the tunnel URL:
   ```env
   VITE_API_BASE_URL=https://funny-frogs-sleep.localtunnel.me/api
   ```
3. Run the frontend. Now, actions in the UI will call the tunneled Express server.

---

## Reminders
- **Ephemeral URLs**: The tunnel URL is temporary and changes **every time the tunnel script restarts** (unless you use a paid/custom domain). Remember to update your frontend configuration whenever you restart the tunnel.
- **Security**: The tunnel exposes your port `5000` to the public web. Do not keep the tunnel open when not actively testing.
