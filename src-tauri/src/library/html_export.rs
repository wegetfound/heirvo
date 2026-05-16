//! Standalone single-file HTML export for a library disc.
//!
//! Produces a self-contained .html file with embedded CSS + a tiny vanilla-JS
//! search box that filters transcript lines in-page. No external requests,
//! no build step on the consumer side — just open it in any browser.
//!
//! Aesthetic: matches the Memory Vault design system (warm cream, Fraunces
//! serif, amber accent). Fonts are loaded from Google Fonts on first online
//! view but fall back to system serif/sans gracefully when offline.
//!
//! This file mirrors `src/screens/library/data/htmlExport.ts` — the TS file
//! is the source-of-truth visual design. Keep both in sync.

use crate::library::types::Disc;
use chrono::Utc;
use std::path::Path;

pub fn render_disc_html(disc: &Disc) -> String {
    let grad = gradient_for(&disc.gradient);
    let title = html_escape(&disc.title);
    let date = html_escape(&disc.date);
    let filmed_by = disc.filmed_by.as_deref().map(html_escape).unwrap_or_default();
    let location = disc.location.as_deref().map(html_escape).unwrap_or_default();
    let about = disc.about.as_deref().map(html_escape).unwrap_or_default();
    let source = html_escape(&disc.source);
    let duration = html_escape(&disc.duration_formatted);
    let phrases = format_with_commas(disc.phrases_indexed);
    let scenes_count = disc.scenes.len();
    let people_count = disc.people.len();
    let exported_on = Utc::now().format("%Y-%m-%d").to_string();

    let mut byline_parts: Vec<String> = Vec::new();
    if !filmed_by.is_empty() {
        byline_parts.push(format!("Filmed by {filmed_by}"));
    }
    if !location.is_empty() {
        byline_parts.push(location.clone());
    }
    let byline = byline_parts.join(" · ");

    let topics_html = disc
        .topics
        .iter()
        .map(|t| {
            format!(
                "<span class=\"topic\"><span class=\"topic-label\">{}</span><span class=\"topic-count\">{}</span></span>",
                html_escape(&t.label),
                t.count
            )
        })
        .collect::<Vec<_>>()
        .join("");

    let scenes_html = disc
        .scenes
        .iter()
        .enumerate()
        .map(|(i, s)| {
            let desc = s
                .description
                .as_deref()
                .filter(|d| !d.is_empty())
                .map(|d| format!("<p class=\"scene-desc\">{}</p>", html_escape(d)))
                .unwrap_or_default();
            format!(
                r#"
      <li class="scene">
        <span class="scene-num">{num:02}</span>
        <div class="scene-body">
          <div class="scene-head">
            <span class="scene-title">{title}</span>
            <span class="scene-ts">{time}</span>
          </div>
          {desc}
        </div>
      </li>"#,
                num = i + 1,
                title = html_escape(&s.title),
                time = html_escape(&s.time),
                desc = desc,
            )
        })
        .collect::<Vec<_>>()
        .join("");

    let transcript_html = disc
        .transcript
        .iter()
        .map(|line| {
            let is_stage = line.is_stage_direction.unwrap_or(false);
            let speaker_html = if !is_stage {
                match &line.speaker {
                    Some(sp) if !sp.is_empty() => {
                        format!("<span class=\"speaker\">{}</span>", html_escape(sp))
                    }
                    _ => String::new(),
                }
            } else {
                String::new()
            };
            let text_class = if is_stage { "line stage" } else { "line" };
            let escaped_text = html_escape(&line.text);
            let data_text = escaped_text.to_lowercase();
            format!(
                "<article data-text=\"{data_text}\">\n  <span class=\"ts\">{ts}</span>\n  {speaker}\n  <p class=\"{cls}\">{text}</p>\n</article>",
                data_text = data_text,
                ts = html_escape(&line.time),
                speaker = speaker_html,
                cls = text_class,
                text = escaped_text,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let about_section = if about.is_empty() {
        String::new()
    } else {
        format!(
            "<section class=\"about\"><h2 class=\"sect\">About this memory</h2><p>{about}</p></section>"
        )
    };

    let topics_section = if disc.topics.is_empty() {
        String::new()
    } else {
        format!(
            "<section><h2 class=\"sect\">Topics</h2><div class=\"topics\">{topics_html}</div></section>"
        )
    };

    let scenes_section = if disc.scenes.is_empty() {
        String::new()
    } else {
        format!(
            "<section><h2 class=\"sect\">Scenes</h2><ol class=\"scenes\">{scenes_html}</ol></section>"
        )
    };

    let byline_html = if byline.is_empty() {
        String::new()
    } else {
        format!("<p class=\"byline\">{byline}</p>")
    };
    let date_html = if date.is_empty() {
        String::new()
    } else {
        format!("<p class=\"byline\">{date}</p>")
    };

    let duration_display = if duration.is_empty() {
        "—".to_string()
    } else {
        duration.clone()
    };

    // Inline JS — vanilla, no deps. Filters .transcript article on input and
    // highlights matches with <mark>. Caches original text per article.
    let script = r#"
(function () {
  var input = document.querySelector('input.q');
  var counter = document.querySelector('.match-count');
  if (!input || !counter) return;
  var articles = Array.prototype.slice.call(document.querySelectorAll('.transcript article'));
  var originals = articles.map(function (a) {
    var p = a.querySelector('.line');
    return p ? p.textContent : '';
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function update() {
    var q = input.value.trim().toLowerCase();
    var hits = 0;
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      var p = a.querySelector('.line');
      if (!p) continue;
      var text = a.getAttribute('data-text') || '';
      var orig = originals[i];
      var match = !q || text.indexOf(q) !== -1;
      a.hidden = !match;
      if (match && q) {
        hits++;
        var re = new RegExp(escapeRegex(q), 'gi');
        p.innerHTML = escapeHtml(orig).replace(re, function (m) {
          return '<mark>' + escapeHtml(m) + '</mark>';
        });
      } else {
        p.textContent = orig;
      }
    }
    counter.textContent = q ? (hits + ' match' + (hits === 1 ? '' : 'es')) : '';
  }
  input.addEventListener('input', update);
})();
"#;

    format!(
        r##"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title} — Heirvo Archive</title>
<meta name="description" content="{title} — recovered family memory, archived with Heirvo." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root {{
    --paper: #F8F4EC;
    --paper-2: #F1EAD9;
    --ink: #1B1714;
    --ink-2: #3D342C;
    --muted: #7A6F62;
    --line: #E2D8C4;
    --amber: #C2741F;
    --amber-soft: #E8B98A;
    --serif: 'Fraunces', Georgia, 'Times New Roman', serif;
    --sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{
    font-family: var(--sans);
    background: var(--paper);
    color: var(--ink);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }}
  ::selection {{ background: var(--amber-soft); color: var(--ink); }}
  .container {{ max-width: 860px; margin: 0 auto; padding: 0 28px; }}

  /* ─── Header ─── */
  header.hero {{
    position: relative;
    padding: 80px 0 64px;
    overflow: hidden;
  }}
  header.hero::before {{
    content: "";
    position: absolute;
    inset: -20% -10vw 40% -10vw;
    background:
      linear-gradient(180deg, var(--paper) 0%, transparent 12%, transparent 80%, var(--paper) 100%),
      {grad};
    z-index: 0;
    opacity: .85;
  }}
  .hero-inner {{ position: relative; z-index: 1; }}
  .eyebrow {{
    text-transform: uppercase;
    letter-spacing: .16em;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--ink-2);
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }}
  .eyebrow::before {{
    content: "";
    width: 24px; height: 1px;
    background: var(--ink-2);
    opacity: .55;
  }}
  h1.disc-title {{
    font-family: var(--serif);
    font-weight: 400;
    font-size: clamp(40px, 6vw, 64px);
    line-height: 1.02;
    letter-spacing: -0.025em;
    margin: 20px 0 14px;
    color: var(--ink);
    max-width: 720px;
  }}
  .byline {{
    font-family: var(--serif);
    font-style: italic;
    font-size: 18px;
    color: var(--ink-2);
    margin: 0 0 4px;
  }}

  /* ─── Meta strip ─── */
  section.meta {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 28px 0 12px;
    border-bottom: 1px solid var(--line);
  }}
  .meta-cell {{ padding: 6px 4px; }}
  .meta-label {{
    font-size: 10.5px;
    letter-spacing: .14em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--muted);
    margin-bottom: 4px;
  }}
  .meta-value {{
    font-family: var(--serif);
    font-size: 20px;
    color: var(--ink);
    font-feature-settings: "tnum";
  }}

  /* ─── Sections ─── */
  section {{ padding: 40px 0; }}
  h2.sect {{
    font-family: var(--serif);
    font-weight: 500;
    font-size: 26px;
    letter-spacing: -0.015em;
    margin: 0 0 18px;
    color: var(--ink);
  }}
  .about p {{
    font-family: var(--serif);
    font-weight: 400;
    font-size: 19px;
    line-height: 1.65;
    color: var(--ink-2);
    margin: 0;
    max-width: 640px;
  }}

  /* ─── Topics ─── */
  .topics {{ display: flex; flex-wrap: wrap; gap: 8px; }}
  .topic {{
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    background: var(--paper-2);
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12.5px;
    color: var(--ink-2);
  }}
  .topic-label {{ font-weight: 500; }}
  .topic-count {{
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    font-size: 11px;
  }}

  /* ─── Scenes ─── */
  ol.scenes {{
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 14px;
  }}
  li.scene {{
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 18px;
    padding: 16px 18px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 10px;
  }}
  .scene-num {{
    font-family: var(--serif);
    font-size: 22px;
    color: var(--amber);
    font-variant-numeric: tabular-nums;
  }}
  .scene-head {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
  }}
  .scene-title {{
    font-family: var(--serif);
    font-weight: 500;
    font-size: 17px;
    color: var(--ink);
  }}
  .scene-ts {{
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    background: var(--paper-2);
    padding: 2px 7px;
    border-radius: 4px;
  }}
  .scene-desc {{
    margin: 6px 0 0;
    font-size: 14px;
    color: var(--ink-2);
    line-height: 1.5;
  }}

  /* ─── Search ─── */
  .search-wrap {{
    position: sticky;
    top: 0;
    z-index: 5;
    background: rgba(248, 244, 236, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 14px 0;
    margin: 0 -28px;
    padding-left: 28px;
    padding-right: 28px;
    border-bottom: 1px solid var(--line);
  }}
  .search-row {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  input.q {{
    flex: 1;
    font-family: var(--sans);
    font-size: 15px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease;
  }}
  input.q:focus {{
    border-color: var(--amber);
    box-shadow: 0 0 0 3px rgba(194, 116, 31, 0.15);
  }}
  .match-count {{
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    min-width: 80px;
    text-align: right;
  }}

  /* ─── Transcript ─── */
  .transcript {{ padding: 24px 0 60px; }}
  .transcript article {{
    display: grid;
    grid-template-columns: 80px 1fr;
    grid-template-rows: auto auto;
    gap: 2px 18px;
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
  }}
  .transcript article[hidden] {{ display: none; }}
  .ts {{
    grid-column: 1;
    grid-row: 1 / span 2;
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    padding-top: 4px;
  }}
  .speaker {{
    grid-column: 2;
    grid-row: 1;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--amber);
  }}
  .line {{
    grid-column: 2;
    grid-row: 2;
    font-family: var(--serif);
    font-weight: 400;
    font-size: 17px;
    line-height: 1.6;
    color: var(--ink);
    margin: 0;
  }}
  .line.stage {{
    font-style: italic;
    color: var(--muted);
  }}
  mark {{
    background: var(--amber-soft);
    color: var(--ink);
    padding: 0 2px;
    border-radius: 2px;
  }}

  /* ─── Footer ─── */
  footer.foot {{
    border-top: 1px solid var(--line);
    padding: 32px 0 48px;
    font-size: 12px;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }}
  footer.foot a {{ color: var(--amber); text-decoration: none; }}
  footer.foot a:hover {{ text-decoration: underline; }}

  /* ─── Responsive ─── */
  @media (max-width: 768px) {{
    .container {{ padding: 0 18px; }}
    section.meta {{ grid-template-columns: repeat(2, 1fr); }}
    .transcript article {{ grid-template-columns: 1fr; }}
    .ts {{ grid-row: 1; grid-column: 1; }}
    .speaker {{ grid-row: 2; grid-column: 1; }}
    .line {{ grid-row: 3; grid-column: 1; }}
    .search-wrap {{ margin: 0 -18px; padding-left: 18px; padding-right: 18px; }}
  }}

  /* ─── Print ─── */
  @media print {{
    .search-wrap {{ display: none; }}
    header.hero::before {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    body {{ background: #fff; }}
  }}
</style>
</head>
<body>
  <header class="hero">
    <div class="container hero-inner">
      <span class="eyebrow">Heirvo Archive · {source}</span>
      <h1 class="disc-title">{title}</h1>
      {byline_html}
      {date_html}
    </div>
  </header>

  <div class="container">
    <section class="meta">
      <div class="meta-cell">
        <div class="meta-label">Duration</div>
        <div class="meta-value">{duration_display}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Source</div>
        <div class="meta-value">{source}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Phrases</div>
        <div class="meta-value">{phrases}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Scenes · People</div>
        <div class="meta-value">{scenes_count} · {people_count}</div>
      </div>
    </section>

    {about_section}

    {topics_section}

    {scenes_section}

    <section>
      <h2 class="sect">Transcript</h2>
      <div class="search-wrap">
        <div class="search-row">
          <input class="q" type="search" placeholder="Search the transcript…" aria-label="Search transcript" />
          <span class="match-count" aria-live="polite"></span>
        </div>
      </div>
      <div class="transcript">
{transcript_html}
      </div>
    </section>

    <footer class="foot">
      <div>Created with Heirvo · <a href="https://heirvo.com">heirvo.com</a></div>
      <div>Exported {exported_on}</div>
    </footer>
  </div>

<script>{script}</script>
</body>
</html>
"##
    )
}

pub async fn write_disc_html(disc: &Disc, output: &Path) -> std::io::Result<u64> {
    let html = render_disc_html(disc);
    let bytes = html.as_bytes();
    tokio::fs::write(output, bytes).await?;
    Ok(bytes.len() as u64)
}

// ───────── private helpers ─────────

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// Mirror of the `GradientId` → CSS palette in
/// `src/screens/library/components/GradientArt.tsx`. Unknown ids fall back
/// to the wedding gradient.
fn gradient_for(id: &str) -> &'static str {
    match id {
        "wedding" => "radial-gradient(80% 60% at 50% 40%, #FFEBD4 0%, #E8C39B 40%, #B7846E 100%)",
        "christmas" => "radial-gradient(70% 80% at 30% 30%, #FFDFBF 0%, #C44A3A 55%, #2A1810 100%)",
        "hawaii" => "linear-gradient(160deg, #2A6BA8 0%, #6FB7D6 35%, #F4D87B 70%, #E8814A 100%)",
        "dad60" => "radial-gradient(60% 80% at 60% 40%, #F4D87B 0%, #C2741F 50%, #2B1810 100%)",
        "school" => "linear-gradient(140deg, #FFE6B0 0%, #E8A86A 50%, #8B5A2B 100%)",
        "reunion" => "radial-gradient(80% 70% at 40% 40%, #D9E8C9 0%, #8FB46B 50%, #3F5A2B 100%)",
        "eleanor" => "linear-gradient(160deg, #F8E1E8 0%, #D89BAA 50%, #6E3848 100%)",
        "yellow" => "linear-gradient(165deg, #2E4E2A 0%, #6FA055 40%, #F4D87B 80%, #E89A3C 100%)",
        "capecod" => "linear-gradient(170deg, #4A7BA8 0%, #A8C9E0 50%, #F4E5C0 100%)",
        "babysarah" => "radial-gradient(70% 70% at 50% 60%, #FFF4E0 0%, #F4C895 50%, #9C6A3F 100%)",
        "easter" => "radial-gradient(70% 80% at 40% 40%, #FFE4F0 0%, #C8E4C0 50%, #8FA37C 100%)",
        "newyear" => "radial-gradient(80% 60% at 50% 30%, #FFF1A8 0%, #E89A3C 40%, #2A1828 100%)",
        "graduation" => "linear-gradient(140deg, #2B3D5C 0%, #6E84A8 50%, #F4D87B 100%)",
        "thx" => "radial-gradient(70% 80% at 50% 40%, #F8C57A 0%, #C2741F 50%, #5A2A0F 100%)",
        _ => "radial-gradient(80% 60% at 50% 40%, #FFEBD4 0%, #E8C39B 40%, #B7846E 100%)",
    }
}

/// Format an integer with thousands separators (US-style commas), mirroring
/// the TS side's `.toLocaleString()`.
fn format_with_commas(n: i64) -> String {
    let s = n.abs().to_string();
    let bytes = s.as_bytes();
    let mut out = String::with_capacity(s.len() + s.len() / 3);
    let len = bytes.len();
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            out.push(',');
        }
        out.push(*b as char);
    }
    if n < 0 {
        format!("-{out}")
    } else {
        out
    }
}
