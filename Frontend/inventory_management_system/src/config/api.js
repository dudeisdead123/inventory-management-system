/** Backend API base URL — set REACT_APP_API_URL in production (no trailing slash). */
export const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
);

export const apiUrl = (path) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
};
