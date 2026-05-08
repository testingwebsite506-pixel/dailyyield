const publicVapidKey = "BHQTt-eouqiorYrO3juFOFdde9cudT3y6Unoe9e4F7NRcrnbPw0kNcrAT5_0SYwX4LgK7EFcn8egCMGeyzV2t6U";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(userId: string) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  try {
    // Check if we are in an iframe
    if (window.self !== window.top) {
      console.warn('[Push] Attempting subscription from an iframe. This may fail in some browsers.');
    }

    const register = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // Wait for registration to be ready
    await navigator.serviceWorker.ready;

    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, userId }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    console.log('[Push] Subscribed successfully');
    return true;
  } catch (err: any) {
    console.error('[Push] Subscription failed:', err);
    throw err;
  }
}

export async function askNotificationPermission() {
  if (!('Notification' in window)) return false;
  
  try {
    // Some browsers return a promise, some use a callback. 
    // Modern approach:
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('[Push] Notification.requestPermission failed:', err);
    // Fallback for older browsers if needed, though most modern ones support the promise
    return false;
  }
}
