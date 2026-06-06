import React, { useMemo } from "react";
import { Search, X } from "lucide-react";
import type { Disc } from "../data/types";

const S = {
  container: { display: "flex", flexDirection: "column" as const, gap: 12, padding: "16px", background: "var(--lib-surface-light)", borderRadius: 12, marginBottom: 16 },
  searchBox: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "white", border: "1px solid var(--lib-border-light)", borderRadius: 8, fontSize: 14 },
  searchInput: { flex: 1, border: "none", background: "none", outline: "none", fontFamily: "inherit", fontSize: "inherit" },
  facetsRow: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  facetLabel: { fontSize: 11, fontWeight: 600, color: "var(--lib-text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  facetChips: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  chip: (active: boolean) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 10px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms ease",
    background: active ? "var(--lib-accent)" : "var(--lib-surface)",
    color: active ? "white" : "var(--lib-text-muted)",
    border: `1px solid ${active ? "var(--lib-accent)" : "var(--lib-border-light)"}`,
  } as React.CSSProperties),
  resultCount: { fontSize: 12, color: "var(--lib-text-muted)", fontStyle: "italic" as const },
};

interface DiscMetadataFilterProps {
  discs: Disc[];
  onFilterChange: (filtered: Disc[]) => void;
}

export function DiscMetadataFilter({ discs, onFilterChange }: DiscMetadataFilterProps) {
  const [query, setQuery] = React.useState("");
  const [selectedPeople, setSelectedPeople] = React.useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = React.useState<Set<string>>(new Set());

  // Extract all unique people and topics from discs
  const allPeople = useMemo(() => {
    const names = new Set<string>();
    discs.forEach(d => d.people?.forEach(p => names.add(p.name)));
    return Array.from(names).sort();
  }, [discs]);

  const allTopics = useMemo(() => {
    const labels = new Set<string>();
    discs.forEach(d => d.topics?.forEach(t => labels.add(t.label)));
    return Array.from(labels).sort();
  }, [discs]);

  // Filter discs based on query and selected facets
  const filtered = useMemo(() => {
    return discs.filter(d => {
      // Title/location search
      const queryLower = query.toLowerCase();
      const titleMatch = !query || d.title.toLowerCase().includes(queryLower) || (d.location && d.location.toLowerCase().includes(queryLower));

      // People filter
      const peopleMatch = selectedPeople.size === 0 || d.people?.some(p => selectedPeople.has(p.name));

      // Topics filter
      const topicsMatch = selectedTopics.size === 0 || d.topics?.some(t => selectedTopics.has(t.label));

      return titleMatch && peopleMatch && topicsMatch;
    });
  }, [discs, query, selectedPeople, selectedTopics]);

  React.useEffect(() => {
    onFilterChange(filtered);
  }, [filtered, onFilterChange]);

  const togglePerson = (name: string) => {
    const next = new Set(selectedPeople);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedPeople(next);
  };

  const toggleTopic = (label: string) => {
    const next = new Set(selectedTopics);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setSelectedTopics(next);
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedPeople(new Set());
    setSelectedTopics(new Set());
  };

  const hasFilters = query || selectedPeople.size > 0 || selectedTopics.size > 0;

  return (
    <div style={S.container as React.CSSProperties}>
      {/* Search box */}
      <div style={S.searchBox as React.CSSProperties}>
        <Search size={16} color="var(--lib-text-muted)" />
        <input
          type="text"
          placeholder="Search by title or location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={S.searchInput as React.CSSProperties}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            aria-label="Clear search"
          >
            <X size={16} color="var(--lib-text-muted)" />
          </button>
        )}
      </div>

      {/* Facets */}
      {allPeople.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={S.facetLabel}>People</div>
          <div style={S.facetChips}>
            {allPeople.map((name) => (
              <button
                key={name}
                onClick={() => togglePerson(name)}
                style={S.chip(selectedPeople.has(name)) as React.CSSProperties}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {allTopics.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={S.facetLabel}>Topics</div>
          <div style={S.facetChips}>
            {allTopics.map((label) => (
              <button
                key={label}
                onClick={() => toggleTopic(label)}
                style={S.chip(selectedTopics.has(label)) as React.CSSProperties}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results + clear */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
        <span style={S.resultCount}>
          {filtered.length === discs.length
            ? `${discs.length} ${discs.length === 1 ? "memory" : "memories"}`
            : `${filtered.length} of ${discs.length} memories`}
        </span>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--lib-accent)",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "underline",
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
