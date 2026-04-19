export type AuthBrowser = {
  location: {
    origin: string;
    pathname: string;
    search: string;
    assign: (url: string) => void;
  };
  history: {
    replaceState: (data: unknown, unused: string, url?: string | URL | null) => void;
  };
  sessionStorage: {
    length: number;
    key: (index: number) => string | null;
    removeItem: (key: string) => void;
  };
  document: {
    title: string;
  };
};

function getDefaultBrowser(): AuthBrowser {
  if (typeof window === "undefined") {
    throw new Error("Browser globals are unavailable.");
  }

  return {
    location: window.location,
    history: window.history,
    sessionStorage: window.sessionStorage,
    document: window.document,
  };
}

function resolveBrowser(browser?: AuthBrowser) {
  return browser ?? getDefaultBrowser();
}

export function getBrowserOrigin(browser?: AuthBrowser) {
  return resolveBrowser(browser).location.origin;
}

export function getBrowserSearch(browser?: AuthBrowser) {
  return resolveBrowser(browser).location.search;
}

export function replaceBrowserHistoryPath(browser?: AuthBrowser) {
  const { history, document, location } = resolveBrowser(browser);
  history.replaceState({}, document.title, location.pathname);
}

export function redirectBrowserTo(url: string, browser?: AuthBrowser) {
  resolveBrowser(browser).location.assign(url);
}

export function clearOidcSessionState(browser?: AuthBrowser) {
  const { sessionStorage } = resolveBrowser(browser);
  const keysToRemove: string[] = [];

  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith("oidc.")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}
