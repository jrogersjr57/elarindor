# Elarindor Artwork Repository

This directory stores durable visual-development assets for Elarindor. Character Generation conversations are the workshop; this repository preserves the image assets; Notion and the README files record their meaning, status, continuity notes, and development context.

## Status model

Artwork files are stored directly in the directory for the subject they depict rather than being moved among `exploration/`, `current/`, and `archive/` subdirectories. Status is metadata, not a filesystem location.

Use these status labels in the relevant README and Notion documentation:

- **Exploration** — a viable visual experiment or alternative still under consideration. Presence in GitHub does **not** make an image canon or approved.
- **Current working reference** — the best current visual reference for a subject. Current still does not mean immutable canon unless the corresponding Elarindor documentation explicitly marks it approved.
- **Approved master reference** — artwork James has deliberately approved as authoritative for visual continuity.
- **Superseded** — an older version replaced by later development but retained for history and comparison.
- **Rejected** — a version James has deliberately rejected but which may be retained when its development history remains useful.

Files normally stay at a stable path when their status changes. Update their documentation instead of moving them solely because their status changed.

## Preservation rule

Do not silently overwrite or discard visual development. Artwork that materially influenced development should remain retrievable until James deliberately approves, supersedes, rejects, archives, or requests deletion of it. When competing versions exist, retain enough information to compare them. Permanent deletion should be deliberate rather than an automatic consequence of a status change.

## Visual continuity

Recurring characters must remain visually recognizable across future scenes and artwork. Before generating or revising a recurring character, retrieve the relevant current visual references and associated Notion documentation. Do not redesign faces, species traits, proportions, clothing, jewelry, weapons, hairstyles, or other established identity features merely for variation.

## Current redevelopment state

- **Vaelyn** — active rewrite/redevelopment. Preserve older useful artwork as historical/reference material while keeping newer candidates distinguishable until decisions are approved.
- **Toma** — newly developed; preserve current working development and alternatives.
- **Lythwain** — newly developed; preserve current working development and alternatives.
- **Balroc** — newly developed; preserve current working development and alternatives.

## Directory organization

- `characters/<character-name>/` — individual-character visual development and master references.
- `groups/` — multi-character compositions, party lineups, and height/proportion comparisons.
- `races/` — race/species visual references.
- `locations/` — location and environment references.
- `creatures/` — creature references.
- `world/` — broader visual worldbuilding that does not fit a narrower category.

Keep image filenames descriptive and stable. The README in each subject directory should identify each retained asset and its current status. Notion can provide richer development context and cross-reference the same GitHub asset.