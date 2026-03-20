export interface Env {
  // Environment variables go here
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Define your restricted jurisdictions (ISO-3166-1 alpha-2 codes)
    const RESTRICTED_COUNTRIES = ['US', 'GB', 'CU', 'IR', 'KP', 'SY'];

    // 2. Extract the country code from Cloudflare's edge data
    const userCountry = request.cf?.country as string | undefined;

    // 3. Check if the user is in a restricted area
    if (userCountry && RESTRICTED_COUNTRIES.includes(userCountry)) {
      
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aegis Casino | Restricted Jurisdiction</title>
          <style>
            body { background-color: #020617; color: #cbd5e1; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .container { max-width: 500px; padding: 2rem; border: 1px solid #1e293b; border-radius: 1rem; background-color: #0f172a; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
            h1 { color: #ef4444; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
            p { line-height: 1.5; }
            .code { margin-top: 1.5rem; font-size: 0.875rem; color: #64748b; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>ACCESS DENIED</h1>
            <p>Aegis Casino is currently unavailable in your jurisdiction due to local regulatory restrictions.</p>
            <div class="code">ERR_REGION_BLOCKED (${userCountry})</div>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        status: 403,
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // 4. If they are allowed, pass the request completely untouched to your Next.js app!
    return fetch(request);
  },
};
