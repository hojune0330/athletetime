# AthleteTime Current Copy Source

Last updated: 2026-06-07

Use `docs/athletetime-records-microcopy.md` as the current source of truth for record-search UI copy.

`docs/athletetime-copy-proposals.md` is historical proposal material and appears mojibaked in the current checkout. Do not re-implement older Korean examples from that document unless the newer microcopy document explicitly allows them.

Implementation rule:

- User-facing record copy should describe the product as a collected public-record service, not an official record service.
- Sort/table disclaimers should say the order is based only on records AthleteTime has collected.
- Avoid wording that implies official certification, complete national coverage, AI validation, or a personal athlete database.
- Backend API disclaimers should follow the same wording as the frontend so old copy cannot leak back into the UI.
