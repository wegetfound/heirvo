import { useEffect } from "react";

export function useMeta(title: string, description: string, canonical?: string) {
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

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonicalLink?.href ?? "";
    if (canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;
    }

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
    };
  }, [title, description, canonical]);
}
