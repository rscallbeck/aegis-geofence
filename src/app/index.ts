export interface Env {
  // Resolves the empty interface warning and gives us a place to securely inject
  // your production URL later via the Cloudflare Dashboard.
  NEXTJS_ORIGIN?: string;
}

// A standard list of jurisdictions with strict online gambling prohibitions
const RESTRICTED_COUNTRIES = [
  //"US", // United States
  "GB", // United Kingdom
  "AU", // Australia
  "FR", // France
  "NL", // Netherlands
];

// Assign the object to a variable before exporting to satisfy the linter
const worker = {
  // Prefixed ctx with an underscore to explicitly mark it as unused
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const country = (request.cf?.country as string) || "XX";
    //const country = (request.cf?.country as string) || "US";

    if (RESTRICTED_COUNTRIES.includes(country)) {
      return new Response(
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Access Denied - Aegis Casino</title>
            <style>
                body { background-color: #020617; color: #94a3b8; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
                h1 { color: #ef4444; font-size: 2rem; text-transform: uppercase; letter-spacing: 0.1em; }
                p { max-width: 500px; line-height: 1.5; }
                .country-code { color: #10b981; font-weight: bold; font-size: 1.2rem; }
            </style>
        </head>
        <body>
            <h1>403: Jurisdiction Restricted</h1>
            <p>We're sorry, but Aegis Casino is not available in your region due to local online gambling regulations.</p>
            <p>Your detected region code: <span class="country-code">${country}</span></p>
        </body>
        </html>
        `,
        {
          status: 403,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    const url = new URL(request.url);
    
    // We now use the environment variable! If it's missing (like in local dev), 
    // it falls back to the Docker internal network name.
    const targetOrigin = env.NEXTJS_ORIGIN || "http://web:3000";
    const targetUrl = targetOrigin + url.pathname + url.search;

    const proxiedRequest = new Request(targetUrl, request);

    return fetch(proxiedRequest);
  },
};

export default worker;
