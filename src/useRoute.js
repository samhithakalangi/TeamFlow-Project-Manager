import { useState, useEffect, useCallback } from "react";

/**
 * Normalizes the current URL path or hash to one of:
 * - "/login"
 * - "/signup"
 * - "/" (default workspace dashboard)
 */
export function getNormalizedRoute() {
  if (typeof window === "undefined") return "/";

  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (hash === "login" || hash === "/login") return "/login";
  if (hash === "signup" || hash === "/signup") return "/signup";

  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (pathname === "/login") return "/login";
  if (pathname === "/signup") return "/signup";

  return "/";
}

/**
 * Lightweight URL-driven route hook using standard browser History & Hash APIs.
 * Supports smooth client-side navigation without external router dependencies.
 */
export function useRoute() {
  const [route, setRoute] = useState(getNormalizedRoute);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getNormalizedRoute());
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigate = useCallback((targetPath) => {
    const normalized = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
    
    // Update browser URL history if different
    if (window.location.pathname !== normalized && window.location.hash !== `#${normalized}`) {
      window.history.pushState(null, "", normalized);
    }
    setRoute(normalized);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { route, navigate };
}
