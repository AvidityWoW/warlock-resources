// Join a site-relative path onto the configured base (/warlock-resources), whatever its trailing slash.
export const url = (path = '') => import.meta.env.BASE_URL.replace(/\/?$/, '/') + path.replace(/^\//, '');
