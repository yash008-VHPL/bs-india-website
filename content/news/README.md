# News articles

One Markdown file per article: `content/news/YYYY-MM-DD-slug.md`.
URL becomes `/news/slug`. Reserved slugs: poultry, dairy, authors, feed.

```yaml
---
title: "Article title"
summary: "Max 160 characters. Used as the meta description and in listings."
date: "2026-10-20"          # quoted, YYYY-MM-DD
updated: "2026-11-02"       # optional
authors: [author-id]        # ids from content/authors.json
species: [poultry]          # poultry and/or dairy
products: [bergaapur]       # ids from src/data/products.js (optional)
image: /news/slug/cover.webp   # optional, file in public/news/slug/
takeaways:                  # optional, shown at the top
  - "One-line point."
faq:                        # optional, shown at the end and as FAQPage data
  - q: "Question?"
    a: "Answer."
draft: true                 # optional, keeps it out of the build
---
```

Images and charts: `public/news/<slug>/`, referenced as
`![alt text](/news/<slug>/chart.svg "Caption")`.

Authors (`content/authors.json`), names only as supplied by Yash:

```json
{ "author-id": { "name": "", "role": "", "bio": "", "species": ["poultry"], "sameAs": [] } }
```

The build fails on: bad filename or date, unknown author or product id,
summary over 170 characters, em dashes, internal division names.
