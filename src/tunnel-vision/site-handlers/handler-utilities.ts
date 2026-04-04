export interface TvHandler {
  getTvElements: () => Array<Element> | null
  getScrollableElement: () => Element | undefined
  initDelay: () => Promise<void>
}

export function blankDelay(): Promise<void> {
  return new Promise(resolve => resolve())
}

function isScrollable(el: Element): boolean {
  return el.scrollHeight > el.clientHeight
}

// NOTE: function for discovering the scrollable element
// start somewhere deep in the page and recurse upwards
export function discoverScrollable(deepSelector: string, logElement: boolean = false): Element | undefined {

  let ele = document.querySelector(deepSelector)
  if (!ele) {
    console.error(`discoverScrollable: selector ${deepSelector} did not return an element!`)
    return undefined
  }

  while (!isScrollable(ele)) {
    ele = ele.parentElement as Element
    if (!ele) {
      console.log('discoverScrollable: could not find scrollable ele')
      return undefined
    }
  }

  console.log(`discoverScrollable: found scrollable ele`)
  if (logElement) {
    console.log(ele)
  }

  return ele
}

export function waitForSelector(selector: string, root: Element | Document, timeout: number = 10_000): Promise<Element | Error> {
  return new Promise((resolve, reject) => {
    // Fast path: already exists
    const found = root.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }

    //@ts-ignore
    const observer = new MutationObserver((mutations, obs) => {
      const element = root.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    // Optional: reject after timeout
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForSelector timed out after ${timeout}ms: ${selector}`));
    }, timeout);

    // Cleanup if promise is rejected/cancelled early
    // (optional – many people skip this)
    // But nice to have:
    // reject = (err) => { observer.disconnect(); clearTimeout(timer); origReject(err); }
  });
}

/**
 * Waits for the network to be idle (no active requests for a certain time).
 * 
 * @param {Object} options
 * @param {number} [options.idleTime=500] - Milliseconds the network must stay idle before resolving
 * @param {number} [options.timeout=30000] - Maximum time to wait before rejecting (0 = no timeout)
 * @param {number} [options.maxInflight=0] - Max concurrent requests allowed to still be considered "idle" (0 = completely idle)
 * @returns {Promise<void>}
 */
export async function waitForNetworkIdle(
  idleTime: number = 500,
  timeout: number = 30_000,
  maxInflight: number = 0
): Promise<void> {

  let inflight = 0;
  let lastActivity = Date.now();
  //@ts-ignore
  let resolvePromise;
  //@ts-ignore
  let rejectPromise;
  //@ts-ignore
  let timeoutId;
  //@ts-ignore
  let idleTimer;

  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  // Track fetch requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    inflight++;
    lastActivity = Date.now();
    resetIdleTimer();

    try {
      return await originalFetch(...args);
    } finally {
      inflight--;
      lastActivity = Date.now();
      resetIdleTimer();
    }
  };

  // Track XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  //@ts-ignore
  XMLHttpRequest.prototype.open = function (...args) {
    //@ts-ignore
    this._isTracked = true;
    //@ts-ignore
    return originalOpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    //@ts-ignore
    if (this._isTracked) {
      inflight++;
      lastActivity = Date.now();
      resetIdleTimer();

      const onload = this.onload;
      const onerror = this.onerror;
      const onabort = this.onabort;

      const finish = () => {
        inflight--;
        lastActivity = Date.now();
        resetIdleTimer();
      };

      this.onload = function (...e) {
        finish();
        if (onload) onload.apply(this, e);
      };
      this.onerror = function (...e) {
        finish();
        if (onerror) onerror.apply(this, e);
      };
      this.onabort = function (...e) {
        finish();
        if (onabort) onabort.apply(this, e);
      };
    }
    return originalSend.apply(this, args);
  };

  function resetIdleTimer() {
    //@ts-ignore
    if (idleTimer) clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      if (inflight <= maxInflight) {
        cleanup();
        //@ts-ignore
        resolvePromise();
      } else {
        // Still activity — reset again
        resetIdleTimer();
      }
    }, idleTime);
  }

  function cleanup() {
    //@ts-ignore
    if (timeoutId) clearTimeout(timeoutId);
    //@ts-ignore
    if (idleTimer) clearTimeout(idleTimer);

    // Restore originals
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  }

  // Overall timeout
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      cleanup();
      //@ts-ignore
      rejectPromise(new Error(`waitForNetworkIdle timed out after ${timeout}ms`));
    }, timeout);
  }

  // Initial idle check
  resetIdleTimer();

  // Also consider images, scripts, etc. via PerformanceObserver (bonus coverage)
  try {
    const observer = new PerformanceObserver((_) => {
      lastActivity = Date.now();
      resetIdleTimer();
    });
    observer.observe({ entryTypes: ['resource'] });

    // Clean up observer on finish (optional, but good practice)
    promise.finally(() => observer.disconnect()).catch(() => { });
  } catch (e) {
    // PerformanceObserver not supported or blocked — ignore
  }

  return promise as Promise<void>;
}

