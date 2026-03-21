export interface Env {}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    //const RESTRICTED_COUNTRIES = ['US', 'GB', 'CU', 'IR', 'KP', 'SY'];
    const RESTRICTED_COUNTRIES = ['GB', 'CU', 'IR', 'KP', 'SY'];
    const SECRET_BYPASS_KEY = "open_sesame_123"; 

    // 🚨 FIX: Here is the missing url definition!
    const url = new URL(request.url);
    const cookieHeader = request.headers.get('Cookie') || '';

    // Prevent the local infinite loop AND fix the IPv6 timeout!
    let targetRequest = request;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const localUrl = new URL(request.url);
      localUrl.hostname = '127.0.0.1'; // Force IPv4
      localUrl.port = '3000';
      
      // Clone headers and overwrite the Host so Next.js accepts it
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', '127.0.0.1:3000');
      
      targetRequest = new Request(localUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: request.redirect
      });
    }

    // 1. Check for the Secret Password in the URL
    if (url.searchParams.get('admin') === SECRET_BYPASS_KEY) {
      const response = await fetch(targetRequest);
      const newResponse = new Response(response.body, response);
      
      newResponse.headers.set(
        'Set-Cookie', 
        `aegis_bypass=${SECRET_BYPASS_KEY}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict`
      );
      
      return newResponse;
    }

    // 2. Check if they already have the bypass cookie
    if (cookieHeader.includes(`aegis_bypass=${SECRET_BYPASS_KEY}`)) {
      return fetch(targetRequest); 
    }

    // 3. Standard Geofence Logic for everyone else
    const userCountry = request.cf?.country as string | undefined;

    if (userCountry && RESTRICTED_COUNTRIES.includes(userCountry)) {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aegis Casino | Restricted</title>
          <style>
            body { background-color: #020617; color: #cbd5e1; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .container { max-width: 500px; padding: 2rem; border: 1px solid #1e293b; border-radius: 1rem; background-color: #0f172a; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
            h1 { color: #ef4444; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
            .code { margin-top: 1.5rem; font-size: 0.875rem; color: #64748b; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>ACCESS DENIED</h1>
            <p>Aegis Casino is currently unavailable in your jurisdiction.</p>
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

    // 4. Allowed traffic goes to the app
    return fetch(targetRequest);
  },
};
