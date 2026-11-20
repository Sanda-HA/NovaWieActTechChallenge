const base64Nonce = /^[A-Za-z0-9+/]+={0,2}$/;

export function cspHeader(mode: 'dev' | 'prod', nonce?: string): string {
  let scriptSrc = "'self'";
  if (mode === 'dev') {
    if (!nonce || !base64Nonce.test(nonce)) throw new Error('The dev CSP needs a base64 nonce.');
    scriptSrc += ` 'nonce-${nonce}'`;
  }
  // No nonce in style-src: a nonce there would make browsers ignore 'unsafe-inline',
  // which Astryx's inline layer-order <style> and React style attributes rely on.
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ].join('; ');
}
