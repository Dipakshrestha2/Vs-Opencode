const state = {
  user: null,
  profile: null,
  role: null,
  currentClass: null,
  currentSection: null,
  academicYear: null
};

const listeners = new Map();

export function getState() { return { ...state }; }

export function setState(key, value) {
  state[key] = value;
  if (listeners.has(key)) {
    listeners.get(key).forEach(fn => fn(value));
  }
}

export function onStateChange(key, fn) {
  if (!listeners.has(key)) listeners.set(key, []);
  listeners.get(key).push(fn);
}

export function clearState() {
  Object.keys(state).forEach(k => state[k] = null);
  listeners.clear();
}
