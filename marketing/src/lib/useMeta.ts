import { useEffect } from "react";

export function useMeta(title: string, description: string, canonical?: string, robots?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = metaDesc?.content ?? "";
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // Default to a self-canonical (the current URL) when no explicit canonical
    // is passed. Without this, pages that don't call useMeta with a canonical —
    // or any route served from the shared SPA shell — would have NO canonical
    // and Google would fall back to whatever the static HTML declared (the
    // homepage), which caused mass "Alternate page with proper canonical tag".
    const selfCanonical = `${window.location.origin}${window.location.pathname}`;
    const canonicalValue = canonical || selfCanonical;

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonicalLink?.href ?? "";
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalValue;

    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevRobots = metaRobots?.content ?? "";
    const robotsValue = robots ?? "index, follow";
    if (!metaRobots) {
      metaRobots = document.createElement("meta");
      metaRobots.name = "robots";
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = robotsValue;

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.content = prevDesc;
      if (canonicalLink) {
        if (prevCanonical) {
          canonicalLink.href = prevCanonical;
        } else {
          canonicalLink.remove();
        }
      }
      if (metaRobots) metaRobots.content = prevRobots;
    };
  }, [title, description, canonical, robots]);
}
