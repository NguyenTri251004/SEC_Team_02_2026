import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'inventory-management',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'inventory-frontend',
});

export default keycloak;