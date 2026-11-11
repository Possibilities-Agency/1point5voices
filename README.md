# 1.5 Billion Voices — deploy on Cloudflare

What's in this folder
- `public/index.html` — the website (plus `public/img/` photos, `public/data/world.json` map shapes, `public/privacy.html`)
- `functions/api/sign.js` — saves a signature (blocks duplicate emails)
- `functions/api/stats.js` — live totals for the counter, map and wall (never exposes emails)
- `functions/api/media/` — voice and video pledges: upload, approved-clip gallery, playback
- `schema.sql` — creates the database tables
- `migrate-voice-video.sql` — only for a database created before voice/video was added

Everything below runs on Cloudflare's free plan to start.

## 1. Put the files on GitHub (5 min)
1. Sign in at github.com → **New repository** → name it `1point5voices` → Private → Create.
2. Click **uploading an existing file** and drag in the *contents* of this folder (`public`, `functions`, `schema.sql`, `migrate-voice-video.sql`, `README.md`). Commit.

## 2. Create the site on Cloudflare (5 min)
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choose the repo.
2. Framework preset: **None**. Build command: *leave empty*. Build output directory: `public`.
3. **Save and Deploy**. You get a test address like `1point5voices.pages.dev`.

## 3. Create the signature database (3 min)
1. **Storage & Databases → D1 → Create** → name it `voices`.
2. Open it → **Console** → paste everything in `schema.sql` → **Execute**.

## 4. Create storage for voice and video pledges (2 min)
1. **Storage & Databases → R2** → **Create bucket** → name it `voices-media`. Leave it private (do not turn on public access).
   R2 needs a payment method on file, but the first 10 GB are free and there are no download fees.

## 5. Connect the database and storage to the site (3 min)
1. **Workers & Pages** → your project → **Settings → Bindings → Add → D1 database**.
   Variable name: `DB` (exactly) → database: `voices` → Save.
2. **Add → R2 bucket**. Variable name: `MEDIA` (exactly) → bucket: `voices-media` → Save.
3. Do both for **Production** (and Preview if you use it).
4. **Deployments** → latest → **Retry deployment**. Sign the petition once on the test address and record a short test clip to confirm.

> Already created the database before voice/video was added? Open D1 → `voices` → Console, paste `migrate-voice-video.sql`, Execute.

## 6. Add your domain
- Buy it in Cloudflare (**Domain Registration → Register Domains**, sold at cost) or move an existing one to Cloudflare.
- Project → **Custom domains → Set up a domain** → enter it. Cloudflare handles DNS and HTTPS.

## 7. Turn on bot protection (recommended before launch)
1. **Turnstile → Add widget** → add your domain → Managed mode. Copy the **site key** and **secret key**.
2. In `public/index.html`, find `const TURNSTILE_SITE_KEY = "";` and paste the site key between the quotes. Commit on GitHub.
3. Project → **Settings → Variables and Secrets → Add** → type **Secret**, name `TURNSTILE_SECRET`, value = secret key → Save → redeploy.

## Reviewing voice and video pledges
Recordings never appear on the site until approved. D1 → `voices` → Console:
- See what's waiting: `SELECT m.id, s.first_name, s.country, m.kind, m.created_at FROM media m JOIN signatures s ON s.id = m.signature_id WHERE m.status = 'pending' ORDER BY m.id;`
- Watch or listen: R2 → `voices-media` → `pending/` folder → open the file whose name starts with the signature number.
- Approve: `UPDATE media SET status = 'approved' WHERE id = 12;`
- Reject: `UPDATE media SET status = 'rejected' WHERE id = 12;` (then delete the file in R2)
The site shows the 24 most recent approved clips. Plan who reviews and how often before launch; a simple review screen can be built if volumes grow.

Rough storage cost: a 30-second video is about 3–4 MB. 100,000 videos ≈ 350 GB ≈ US$5 a month on R2.

## Getting the data out
D1 → `voices` → Console:
- Total: `SELECT COUNT(*) FROM signatures;`
- By country: `SELECT country, COUNT(*) n FROM signatures GROUP BY country ORDER BY n DESC;`
- Opted-in mailing list: `SELECT first_name, email, country FROM signatures WHERE updates = 1;`

## Notes
- Share previews (WhatsApp, Facebook, X, LinkedIn) use `public/img/share-card.jpg` and point to https://voicesof1point5.org. If the domain changes, update the `og:url` and `og:image` lines near the top of `index.html`.
- Edits: change a file on GitHub and Cloudflare redeploys in about a minute.
- Counter, map and wall refresh every 30 seconds.
- Collecting emails from signers worldwide (including the EU) means you should publish a short privacy notice and name who is responsible for the data before launch.
