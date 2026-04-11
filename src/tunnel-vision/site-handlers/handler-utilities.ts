import { TvDirector } from "../tv-director"

const LOG_ELEMENTS = false

let DEFAULT_MUTATION_TIMEOUT: undefined | NodeJS.Timeout = undefined

// TODO: make getTvElements and getScrollableElement async so they dont block normal user interaction and so the default getScrollableElement can be discoverScrollableFromCenterPromise
export interface TvHandler {
  getTvElements: () => Array<Element> | null
  getScrollableElement: () => Element | null
  initDelay: () => Promise<void>
  mutationHandler: TvMutationSubHandler | null
}

export interface TvMutationSubHandler {
  mutationCallback: (curDir: TvDirector, mutations: Array<MutationRecord>) => void
  getMutationTarget: () => Node | null
}

export function blankDelay(): Promise<void> {
  return new Promise(resolve => resolve())
}

function isScrollable(ele: Element): boolean {
  const map = ele.computedStyleMap()
  const overflowY = map.get('overflow-y')
  return (overflowY == 'scroll' || overflowY == 'auto')
}

// NOTE: function for discovering the scrollable element: start somewhere deep in the page and recurse upwards
export function discoverScrollable(startElement: Element): Element | undefined {
  let ele = startElement

  while (!isScrollable(ele)) {
    ele = ele.parentElement as Element
    if (!ele) {
      console.log('discoverScrollable: could not find scrollable ele')
      return undefined
    }
  }

  // NOTE: if the scrollable element is a body tag scrollElementIntoView breaks
  if (ele.tagName === 'BODY') return undefined

  if (LOG_ELEMENTS) {
    console.log(`discoverScrollable: found scrollable ele`)
    console.log(ele)
  }

  return ele
}

export function discoverScrollableFromCenter(): Element | null {
  const centerEle = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
  if (centerEle === null) {
    console.warn(`discoverScrollableFromCenter: could not get element at center of screen!`)
    return null
  }
  const scrollable = discoverScrollable(centerEle)
  if (scrollable === undefined) {
    console.log(`discoverScrollableFromCenter: no scrollable element found`)
    return null
  }
  return scrollable
}

export async function discoverScrollableFromCenterPromise(): Promise<Element | null> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const scrollable = discoverScrollableFromCenter()
      resolve(scrollable);
    });
  });
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
  //@ts-ignore NOTE: If you try to npm run build without this ignore here the compiler gets mad
  let lastActivity;
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


/**
 * Options for waitForDOMIdle
 */
export interface WaitForDOMIdleOptions {
  /**
   * Maximum time to wait before rejecting the promise (in milliseconds).
   * Set to 0 to disable timeout.
   * @default 30000
   */
  timeout?: number;

  /**
   * The DOM node to observe for mutations.
   * @default document.documentElement
   */
  target?: Node;

  /**
   * MutationObserver configuration.
   * @default { childList: true, subtree: true, attributes: true, characterData: true }
   */
  observerOptions?: MutationObserverInit;
}

/**
 * Waits until the DOM has been stable (no mutations) for the specified idle time.
 *
 * @param idleTime - Milliseconds of no DOM changes before resolving
 * @param options - Configuration options
 * @returns Promise that resolves when DOM has been idle for `idleTime` ms
 */
export async function waitForDOMIdle(
  idleTime: number = 500,
  options: WaitForDOMIdleOptions = {}
): Promise<void> {
  const {
    timeout = 30000,
    target = document.documentElement,
    observerOptions = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: true,
    },
  } = options;

  if (idleTime <= 0) {
    return Promise.resolve();
  }

  let resolvePromise: () => void;
  let rejectPromise: (reason?: any) => void;
  let idleTimer: NodeJS.Timeout | number | null = null;
  let timeoutId: NodeJS.Timeout | number | null = null;

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const observer = new MutationObserver(() => {
    // Any mutation resets the idle timer
    resetIdleTimer();
  });

  function resetIdleTimer(): void {
    if (idleTimer) {
      clearTimeout(idleTimer as NodeJS.Timeout);
    }

    idleTimer = setTimeout(() => {
      cleanup();
      resolvePromise();
    }, idleTime);
  }

  function cleanup(): void {
    if (idleTimer) {
      clearTimeout(idleTimer as NodeJS.Timeout);
      idleTimer = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId as NodeJS.Timeout);
      timeoutId = null;
    }
    observer.disconnect();
  }

  // Overall timeout protection
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      cleanup();
      rejectPromise(new Error(`waitForDOMIdle timed out after ${timeout}ms`));
    }, timeout);
  }

  // Start observing
  observer.observe(target, observerOptions);

  // Start the initial idle timer (in case there are no mutations)
  resetIdleTimer();

  return promise;
}

function nodeIsVisible(node: Node): boolean {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node as Element).checkVisibility()
  }
  if (!node.parentElement) return false
  return node.parentElement.checkVisibility()
}

export async function mutationsContainAddedText(mutations: MutationRecord[]): Promise<boolean> {
  for (let idx = 0; idx < mutations.length; idx++) {
    const rec = mutations[idx]
    if (rec.addedNodes.length > 0) {
      for (let jdx = 0; jdx < rec.addedNodes.length; jdx++) {
        const addedNode = rec.addedNodes[jdx]
        if (nodeIsVisible(addedNode) && addedNode.textContent && addedNode.textContent.trim().length > 0) {
          // console.log('mutationsContainAddedText: found some text:', addedNode.textContent)
          return true
        }
      }
    }
  }
  return false
}


export function defaultMutationCallback(curDir: TvDirector, _mutations: Array<MutationRecord>): void {
  clearTimeout(DEFAULT_MUTATION_TIMEOUT)
  DEFAULT_MUTATION_TIMEOUT = setTimeout(curDir.initRanges, 100)
}

export function defaultGetMutationTarget(): Node {
  return document.body
}

export const defaultMutationHandler: TvMutationSubHandler = {
  mutationCallback: defaultMutationCallback,
  getMutationTarget: defaultGetMutationTarget
}

