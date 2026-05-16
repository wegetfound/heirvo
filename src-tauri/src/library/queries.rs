//! SQL queries for the Library tables. Uses runtime sqlx builders (no macro
//! prepare cache required) — mirrors the convention in `session::manager`.

use crate::error::{AppError, AppResult};
use crate::library::types::{Disc, Person, Scene, SearchHit, TopicTag, TranscriptLine};
use crate::session::db::Db;
use chrono::Utc;
use sqlx::Row;

/// Insert a complete disc + all related rows in a single transaction.
/// Used by the demo seeder; in the future will also be used by the post-
/// recovery pipeline when a recovered DVD becomes a library entry.
pub async fn insert_disc(db: &Db, disc: &Disc) -> AppResult<()> {
    let now = Utc::now().timestamp();
    let mut tx = db.pool.begin().await?;

    sqlx::query(
        "INSERT INTO library_discs
         (id, title, year, date_display, filmed_by, location, source, status,
          duration_sec, duration_formatted, recovered_at, phrases_indexed,
          monogram_id, gradient, about, session_id, video_path,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)",
    )
    .bind(&disc.id)
    .bind(&disc.title)
    .bind(disc.year)
    .bind(&disc.date)
    .bind(&disc.filmed_by)
    .bind(&disc.location)
    .bind(&disc.source)
    .bind(&disc.status)
    .bind(disc.duration_sec)
    .bind(&disc.duration_formatted)
    .bind(&disc.recovered_at)
    .bind(disc.phrases_indexed)
    .bind(disc.monogram_id)
    .bind(&disc.gradient)
    .bind(&disc.about)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    for (i, line) in disc.transcript.iter().enumerate() {
        sqlx::query(
            "INSERT INTO library_transcript_lines
             (disc_id, line_order, time_sec, time_display, speaker, text, is_stage_direction)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&disc.id)
        .bind(i as i64)
        .bind(line.time_sec)
        .bind(&line.time)
        .bind(&line.speaker)
        .bind(&line.text)
        .bind(line.is_stage_direction.unwrap_or(false) as i64)
        .execute(&mut *tx)
        .await?;
    }

    for (i, scene) in disc.scenes.iter().enumerate() {
        sqlx::query(
            "INSERT INTO library_scenes
             (disc_id, scene_order, time_sec, time_display, title, description)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&disc.id)
        .bind(i as i64)
        .bind(scene.time_sec)
        .bind(&scene.time)
        .bind(&scene.title)
        .bind(&scene.description)
        .execute(&mut *tx)
        .await?;
    }

    for topic in &disc.topics {
        sqlx::query("INSERT INTO library_topics (disc_id, label, count) VALUES (?, ?, ?)")
            .bind(&disc.id)
            .bind(&topic.label)
            .bind(topic.count)
            .execute(&mut *tx)
            .await?;
    }

    for person in &disc.people {
        sqlx::query("INSERT INTO library_people (disc_id, initials, name) VALUES (?, ?, ?)")
            .bind(&disc.id)
            .bind(&person.initials)
            .bind(&person.name)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(())
}

/// Count discs currently in the library — used by the seeder to guard
/// against double-inserts.
pub async fn count_discs(db: &Db) -> AppResult<i64> {
    let row = sqlx::query("SELECT COUNT(*) AS n FROM library_discs")
        .fetch_one(&db.pool)
        .await?;
    let n: i64 = row.try_get("n")?;
    Ok(n)
}

/// List all discs, ordered by year DESC (then title). Includes the joined
/// scenes/topics/people/transcript so the frontend can render rails immediately.
pub async fn list_discs(db: &Db) -> AppResult<Vec<Disc>> {
    let rows = sqlx::query(
        "SELECT id FROM library_discs ORDER BY year DESC NULLS LAST, title ASC",
    )
    .fetch_all(&db.pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        let id: String = row.try_get("id")?;
        if let Some(disc) = get_disc(db, &id).await? {
            out.push(disc);
        }
    }
    Ok(out)
}

/// Fetch a single disc with all joined data.
pub async fn get_disc(db: &Db, id: &str) -> AppResult<Option<Disc>> {
    let row = sqlx::query("SELECT * FROM library_discs WHERE id = ?")
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;
    let Some(row) = row else { return Ok(None) };

    // Transcript lines, ordered.
    let trans_rows = sqlx::query(
        "SELECT time_display, time_sec, speaker, text, is_stage_direction
         FROM library_transcript_lines
         WHERE disc_id = ? ORDER BY line_order ASC",
    )
    .bind(id)
    .fetch_all(&db.pool)
    .await?;
    let transcript = trans_rows
        .into_iter()
        .map(|r| -> AppResult<TranscriptLine> {
            let is_sd: i64 = r.try_get("is_stage_direction")?;
            Ok(TranscriptLine {
                time: r.try_get("time_display")?,
                time_sec: r.try_get("time_sec")?,
                speaker: r.try_get::<Option<String>, _>("speaker").ok().flatten(),
                text: r.try_get("text")?,
                is_stage_direction: if is_sd != 0 { Some(true) } else { None },
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    let scene_rows = sqlx::query(
        "SELECT time_display, time_sec, title, description
         FROM library_scenes WHERE disc_id = ? ORDER BY scene_order ASC",
    )
    .bind(id)
    .fetch_all(&db.pool)
    .await?;
    let scenes = scene_rows
        .into_iter()
        .map(|r| -> AppResult<Scene> {
            Ok(Scene {
                time: r.try_get("time_display")?,
                time_sec: r.try_get("time_sec")?,
                title: r.try_get("title")?,
                description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    let topic_rows = sqlx::query(
        "SELECT label, count FROM library_topics WHERE disc_id = ? ORDER BY count DESC, label ASC",
    )
    .bind(id)
    .fetch_all(&db.pool)
    .await?;
    let topics = topic_rows
        .into_iter()
        .map(|r| -> AppResult<TopicTag> {
            Ok(TopicTag {
                label: r.try_get("label")?,
                count: r.try_get("count")?,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    let people_rows = sqlx::query(
        "SELECT initials, name FROM library_people WHERE disc_id = ? ORDER BY id ASC",
    )
    .bind(id)
    .fetch_all(&db.pool)
    .await?;
    let people = people_rows
        .into_iter()
        .map(|r| -> AppResult<Person> {
            Ok(Person {
                initials: r.try_get("initials")?,
                name: r.try_get("name")?,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    let year_opt: Option<i64> = row.try_get("year").ok();
    let about: Option<String> = row.try_get::<Option<String>, _>("about").ok().flatten();
    let filmed_by: Option<String> = row.try_get::<Option<String>, _>("filmed_by").ok().flatten();
    let location: Option<String> = row.try_get::<Option<String>, _>("location").ok().flatten();
    let recovered_at: Option<String> = row
        .try_get::<Option<String>, _>("recovered_at")
        .ok()
        .flatten();
    let duration_formatted: Option<String> = row
        .try_get::<Option<String>, _>("duration_formatted")
        .ok()
        .flatten();
    let date_display: Option<String> = row
        .try_get::<Option<String>, _>("date_display")
        .ok()
        .flatten();

    Ok(Some(Disc {
        id: row.try_get("id")?,
        title: row.try_get("title")?,
        year: year_opt.unwrap_or(0),
        date: date_display.unwrap_or_default(),
        filmed_by,
        location,
        source: row.try_get("source")?,
        status: row.try_get("status")?,
        duration_formatted: duration_formatted.unwrap_or_default(),
        duration_sec: row.try_get("duration_sec")?,
        recovered_at: recovered_at.unwrap_or_default(),
        phrases_indexed: row.try_get("phrases_indexed")?,
        scenes,
        topics,
        people,
        transcript,
        monogram_id: row.try_get("monogram_id")?,
        gradient: row.try_get("gradient")?,
        about,
    }))
}

/// Replace all transcript lines for a disc in a single transaction.
/// Used by the transcription worker once a job completes. The FTS5 triggers
/// on `library_transcript_lines` keep the search index in sync automatically.
pub async fn replace_transcript_lines(
    db: &Db,
    disc_id: &str,
    lines: &[TranscriptLine],
) -> AppResult<()> {
    let mut tx = db.pool.begin().await?;
    sqlx::query("DELETE FROM library_transcript_lines WHERE disc_id = ?")
        .bind(disc_id)
        .execute(&mut *tx)
        .await?;
    for (i, line) in lines.iter().enumerate() {
        sqlx::query(
            "INSERT INTO library_transcript_lines
             (disc_id, line_order, time_sec, time_display, speaker, text, is_stage_direction)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(disc_id)
        .bind(i as i64)
        .bind(line.time_sec)
        .bind(&line.time)
        .bind(&line.speaker)
        .bind(&line.text)
        .bind(line.is_stage_direction.unwrap_or(false) as i64)
        .execute(&mut *tx)
        .await?;
    }
    // Bump phrase count + updated_at to reflect new transcript.
    let now = Utc::now().timestamp();
    sqlx::query(
        "UPDATE library_discs SET phrases_indexed = ?, updated_at = ? WHERE id = ?",
    )
    .bind(lines.len() as i64)
    .bind(now)
    .bind(disc_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(())
}

/// FTS5 full-text search across transcript lines. Returns up to 100 hits,
/// joined back to the parent disc for title/date display.
pub async fn search(db: &Db, query: &str) -> AppResult<Vec<SearchHit>> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    // Build the FTS5 query: tokenize on whitespace, lowercase, drop dupes,
    // wrap each term in double-quotes (FTS5 phrase-quote) to escape any
    // operator characters in user input, then OR them together so partial
    // matches still rank.
    let mut terms: Vec<String> = q
        .split_whitespace()
        .map(|t| t.to_lowercase())
        .filter(|t| !t.is_empty())
        .collect();
    terms.sort();
    terms.dedup();
    if terms.is_empty() {
        return Ok(Vec::new());
    }
    let fts_query = terms
        .iter()
        .map(|t| format!("\"{}\"", t.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" OR ");

    // Join FTS → lines → discs. Order by FTS rank (lower = better in sqlite FTS5).
    let sql = "SELECT l.time_display, l.time_sec, l.speaker, l.text,
                      d.id AS disc_id, d.title AS disc_title, d.date_display AS disc_date
               FROM library_transcript_fts f
               JOIN library_transcript_lines l ON l.id = f.rowid
               JOIN library_discs d ON d.id = l.disc_id
               WHERE library_transcript_fts MATCH ?
               ORDER BY f.rank
               LIMIT 100";

    let rows = sqlx::query(sql)
        .bind(&fts_query)
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            // Surface as Database error — bad MATCH syntax shouldn't crash.
            AppError::Database(e)
        })?;

    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        let text: String = row.try_get("text")?;
        let text_lower = text.to_lowercase();
        let matched: Vec<String> = terms
            .iter()
            .filter(|t| text_lower.contains(t.as_str()))
            .cloned()
            .collect();
        let disc_date: Option<String> = row
            .try_get::<Option<String>, _>("disc_date")
            .ok()
            .flatten();
        out.push(SearchHit {
            disc_id: row.try_get("disc_id")?,
            disc_title: row.try_get("disc_title")?,
            disc_date: disc_date.unwrap_or_default(),
            time: row.try_get("time_display")?,
            time_sec: row.try_get("time_sec")?,
            speaker: row.try_get::<Option<String>, _>("speaker").ok().flatten(),
            snippet: text,
            matched_terms: if matched.is_empty() {
                terms.clone()
            } else {
                matched
            },
        });
    }
    Ok(out)
}
