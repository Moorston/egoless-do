import { registerRootComponent } from 'expo';
import App from './App';
import { initSentry } from './src/sentry';

// Initialize Sentry before the app starts (no-op if DSN not configured)
initSentry();

registerRootComponent(App);
