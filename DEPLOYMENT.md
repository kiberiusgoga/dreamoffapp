# Deploy DreamOff without buying a domain

DreamOff is a dream journal: users register, write or dictate dreams, select an interpretation style, generate an AI interpretation and image, and browse saved dreams. The website uses React/Vite; the backend uses Express, SQLite, Google Gemini, and Hugging Face.

The README describes an older version. Accounts and dreams now live in the server database, not just the browser. Follow-up chat and ads are placeholders; archive search is not implemented. Dictation uses browser speech recognition and should be tested in Chrome or Edge over HTTPS.

## Choose hosting

The simplest deployment is **one Render Web Service**. The existing server serves both the website and `/api` requests. You get an address such as `https://dreamoff-demo.onrender.com`, with HTTPS, without buying a domain. [Render deployment instructions](https://render.com/docs/deploy-node-express-app).

Choose **Free** for a temporary demo. It sleeps after 15 minutes without traffic, and its SQLite changes are lost on sleep, restart, or redeployment. Use disposable test accounts and dreams. It does not provide reliable storage for your dad's journal. [Free service limitations](https://render.com/docs/free).

For accounts and dreams to stay saved, choose a **paid web service with a persistent disk**, following step 5. Check the displayed service and disk prices before purchase. [Persistent disks](https://render.com/docs/disks), [pricing](https://render.com/pricing).

Vercel alone cannot preserve this application's local SQLite database. A Vercel website can forward requests to a Render backend; optional instructions are below. [Vercel's SQLite explanation](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).

## 1. Get the prepared code onto GitHub

The local checkout points to `https://github.com/kiberiusgoga/dreamoffapp` on branch `main`.

1. Sign into the GitHub account that can push to this repository.
2. In GitHub Desktop, choose **File > Add local repository** and select `C:\Users\user\Documents\dreamoffapp`. You can also use your editor's Source Control panel.
3. Before committing, stop tracking the old database, build, and backup ZIP files. They are already tracked, so the new `.gitignore` alone is insufficient. Run this in PowerShell from the project folder:

   ```powershell
   & "C:\Program Files\Git\cmd\git.exe" rm -r --cached -- database.sqlite dist "package.zip" "package (2).zip"
   ```

   This keeps your local files, including the database, and removes them from future source commits. Existing local accounts will not automatically appear on the deployed site. Previous Git history still contains those files; use a private repository if it contains personal data.

4. Commit the source changes and this guide, with a message such as `Prepare DreamOff for deployment`, then **Push origin**.

There is an old GitHub Actions workflow called **Deploy to cPanel (Namecheap)**. If moving away from that deployment, disable it in GitHub's Actions tab before pushing so updates do not also deploy to the old FTP destination.

## 2. Get the AI keys

Both keys are required by the current dream submission flow: it requests an interpretation and an image together.

- **Google Gemini:** create an API key in [Google AI Studio](https://aistudio.google.com/apikey). [Google's instructions](https://ai.google.dev/gemini-api/docs/api-key).
- **Hugging Face:** create a token at [Access Tokens](https://huggingface.co/settings/tokens) with permission to **Make calls to Inference Providers**. Enable the `fal-ai` provider in your [Inference Providers settings](https://huggingface.co/settings/inference-providers) if needed. The prepared code uses that provider for the SDXL image model. [Text-to-image documentation](https://huggingface.co/docs/inference-providers/tasks/text-to-image).

AI usage has separate quotas and billing. Hugging Face offers limited experimental credits; check the available balance. A free hosting plan does not make AI usage unlimited. [Hugging Face pricing](https://huggingface.co/docs/inference-providers/pricing).

Keep keys in Render's environment settings; do not commit them to GitHub.

## 3. Create the Render service

1. Sign into [Render](https://dashboard.render.com/) using GitHub.
2. Click **New > Web Service**. Do not select Static Site.
3. Connect the `kiberiusgoga/dreamoffapp` repository and authorize access if prompted.
4. Enter these settings:

| Setting | Value |
| --- | --- |
| Name | `dreamoff-demo`, or an available name |
| Branch | `main` |
| Root Directory | Leave blank |
| Language / Runtime | Node |
| Build Command | `npm ci --include=dev && npm --prefix server ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free for a demo, or a paid instance for persistent storage |

Do not set Root Directory to `server`: the build needs the website at the repository root too.

## 4. Set environment variables

Add these in Render's Environment section:

| Name | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | A new random secret of at least 32 characters, for example generated by your password manager |
| `JWT_EXPIRES_IN` | `7d` |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `HUGGINGFACE_API_KEY` | Your Hugging Face token |

Leave `PORT` unset; the server reads the value Render supplies. Keep `JWT_SECRET` stable across deployments so existing login tokens stay valid.

If Google later retires the configured model, change `GEMINI_MODEL` to an available text-generation model in your account. [Google model deprecations](https://ai.google.dev/gemini-api/docs/deprecations).

## 5. Add durable storage if using a paid instance

Skip this step for the temporary free demo.

1. In service creation's advanced settings, or the service's Disks page, add a persistent disk.
2. Set **Mount Path** to `/var/data` and choose a small disk, such as 1 GB.
3. Add an environment variable: `DATABASE_PATH=/var/data/database.sqlite`.

Both the disk and the database path are necessary: only files inside the mount path survive restarts. This starts with an empty database. If you need your dad's existing local accounts and dreams, back up the local database and arrange a separate migration before using the deployed journal.

## 6. Deploy

Click **Deploy Web Service**, then wait for the build and startup to finish.

The logs should contain:

```text
SQLite connected successfully
SQLite models synchronized
Server running on port ...
```

Open the HTTPS address shown by Render. The exact name depends on availability.

## 7. Check the deployed app

1. Open `https://YOUR-SERVICE.onrender.com/api/health`. It should return JSON containing `"status":"ok"`.
2. Open the main address and register a test account.
3. Write a short dream, select an interpretation style, and submit it. The advertisement screen is currently a placeholder; finish or skip its timer to continue.
4. Confirm that the interpretation and image appear.
5. Refresh, open the archive, and confirm the dream is still present.
6. Log out and log back in.
7. On a paid service with a disk, restart the service and confirm the account and dream survive.

If submitting a dream says **Failed to process dream**, check Render's logs. The current flow fails if either AI request fails. Check API keys, Hugging Face inference permission/provider balance, Gemini model availability, and rate limits.

## 8. Publish later updates

Commit and push changes to the connected branch. Render can deploy those commits automatically. You do not need to manually upload `dist` files or use FTP.

## Optional: use a vercel.app address

This adds another hosting service. Finish the Render setup first; its database storage requirements still apply.

1. Create `vercel.json` at the project root. Replace the example backend address with your actual Render URL:

   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://YOUR-SERVICE.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. Commit and push the file.
3. In Vercel, choose **Add New > Project**, import the same repository, and select **Vite**.
4. Use the repository root, build command `npm run build`, and output directory `dist`. Keep the normal dependency installation.
5. Deploy and open the generated `vercel.app` address.
6. Repeat the health, registration, and dream tests through that address.

API secrets stay on Render. The rewrite forwards the website's `/api` requests to the backend. Do not replace it with only an SPA rewrite, which would send API requests to an HTML page. [Vercel rewrites](https://vercel.com/docs/routing/rewrites), [Vite deployment](https://vercel.com/docs/frameworks/frontend/vite).

## What was prepared and tested locally

- Fixed the start scripts and the development API port.
- Fixed the bcrypt import and Sequelize class fields that broke registration/user data.
- Added storage and API responses for dream text, interpretation, image, model, layout, language, and transcription.
- Allowed image payloads larger than the default JSON body limit.
- Replaced table rebuilding at startup with additive changes to preserve account/dream associations across restarts.
- Added a configurable database path for a persistent disk and a configurable Gemini model.
- Selected the live `fal-ai` provider for the existing SDXL model.
- Added ignore rules for generated files, databases, and old ZIP archives; already tracked files require step 1's untracking command.

Verified: production website build, server startup, registration/login, saving and fetching complete dream records with a large image payload, persistence after restart, account isolation, owner deletion, and serving the website. These checks used a separate temporary database, not your dad's database. Live Google/Hugging Face generation and an actual hosted deployment have not been tested because account credentials are not available.
