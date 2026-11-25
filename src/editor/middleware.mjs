// Dev only (added by integration.mjs under `astro dev`): copy each element's source annotation into data-ge-src, because
// Astro's dev toolbar removes data-astro-source-file / -loc from the page as soon as it loads.
export const onRequest = async (_ctx, next) => {
  const res = await next();
  if (!res.headers.get('content-type')?.includes('text/html')) return res;
  const html = (await res.text()).replace(/ data-astro-source-file="([^"]*)" data-astro-source-loc="([^"]*)"/g, '$& data-ge-src="$1|$2"');
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
};
