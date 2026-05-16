import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { MOCK_DISCS, getDiscById } from "./data/mockDiscs";
import { HeroFeatured } from "./components/HeroFeatured";
import { DiscRail } from "./components/DiscRail";

export default function Library() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const featured = getDiscById("hawaii-vacation") ?? MOCK_DISCS[0];

  const recentlyRecovered = MOCK_DISCS.slice(0, 8);
  const onThisDay = [
    "hawaii-vacation",
    "baby-emma-first-steps",
    "graduation-michael",
    "family-reunion-lake-house",
    "road-trip-route-66",
    "thanksgiving-aunt-mary",
  ]
    .map((id) => getDiscById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const birthdays = [
    "dads-60th",
    "eleanor-80th",
    "baby-emma-first-steps",
    "kids-first-day-school",
  ]
    .map((id) => getDiscById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const trips = [
    "hawaii-vacation",
    "camping-yellowstone",
    "road-trip-route-66",
    "family-reunion-lake-house",
  ]
    .map((id) => getDiscById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="lib-root">
      <div className="lib-container">
        <form onSubmit={submit} className="lib-search-form">
          <Search size={16} className="lib-search-icon" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search every spoken word…  try "birthday"'
            className="lib-search-input"
          />
        </form>

        <HeroFeatured disc={featured} />

        <DiscRail
          title="Recently recovered"
          sub="From the last 30 days · 7 discs, 14 hours restored"
          discs={recentlyRecovered}
        />
        <DiscRail
          title="On this day in your archive"
          sub="May 16 across the years — birthdays, beaches, backyards"
          discs={onThisDay}
          showStatus={false}
        />
        <DiscRail
          title="Family birthdays"
          sub='Curated automatically from cake, candles & "happy birthday" detected in audio'
          discs={birthdays}
          showStatus={false}
        />
        <DiscRail
          title="Trips & vacations"
          sub="Places you went, road songs you sang in the back seat"
          discs={trips}
          showStatus={false}
        />

        <footer
          style={{
            padding: "48px 0 60px",
            borderTop: "1px solid var(--lib-line)",
            marginTop: 64,
            color: "var(--lib-muted)",
            fontSize: 12.5,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>Heirvo · {MOCK_DISCS.length} discs in your library · backed up locally</div>
          <div>v0.9 preview</div>
        </footer>
      </div>
    </div>
  );
}
