const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const isLocalDevHost = LOCAL_DEV_HOSTS.has(window.location.hostname)
const isNativeCapacitor = typeof window !== 'undefined' && !!window.Capacitor

async function unregisterAllServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}

// Guarded service-worker registration to avoid failing fetch errors in dev or native.
if ('serviceWorker' in navigator) {
  // Keep localhost and native environments SW-free to avoid stale cache issues
  // that can break Vite module endpoints like /@vite/client.
  if (isLocalDevHost || isNativeCapacitor) {
    unregisterAllServiceWorkers().catch((err) => {
      console.warn('Service worker cleanup failed:', err)
    })
  } else {
    window.addEventListener('load', async () => {
      try {
        // Try fetching the service worker script first to ensure it's available.
        const res = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
        if (res.ok) {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          console.log('Service worker registered')
        } else {
          console.warn('Service worker not registered - /sw.js returned', res.status)
        }
      } catch (err) {
        console.warn('Service worker registration skipped:', err)
      }
    })
  }
}
