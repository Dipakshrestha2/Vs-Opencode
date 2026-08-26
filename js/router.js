const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

async function handleRoute() {
  const hash = window.location.hash.slice(1) || '/login';
  const parts = hash.split('/').filter(Boolean);
  const routeKey = '/' + parts.slice(0, 2).join('/');
  const params = parts.slice(2);

  if (routes[routeKey]) {
    currentRoute = routeKey;
    const container = document.getElementById('main-content');
    if (container) {
      container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
      await routes[routeKey](container, ...params);
    }
  } else if (routes['/' + parts[0]]) {
    currentRoute = '/' + parts[0];
    const container = document.getElementById('main-content');
    if (container) {
      container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
      await routes['/' + parts[0]](container, ...parts.slice(1));
    }
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function getCurrentRoute() { return currentRoute; }
