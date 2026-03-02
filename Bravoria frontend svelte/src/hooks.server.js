// src/hooks.server.js
export const handleError = ({ error, event }) => {
  console.error('🔥 SvelteKit error:', event.url.toString());
  console.error(error);
};