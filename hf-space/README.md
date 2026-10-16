---
title: Scan2Recycle Classifier
emoji: ♻️
colorFrom: green
colorTo: yellow
sdk: gradio
sdk_version: 6.29.1
app_file: app.py
pinned: false
license: mit
short_description: CLIP zero-shot classifier for recyclable items
---

# Scan2Recycle classifier

Gradio Space used by the Scan2Recycle web app. It runs
[`openai/clip-vit-base-patch32`](https://huggingface.co/openai/clip-vit-base-patch32)
zero-shot image classification on free CPU hardware.

## API

`POST /predict` (via `@gradio/client`)

| Input | Type | Example |
|-------|------|---------|
| `image` | image file / Blob | photo of an item |
| `labels_csv` | string, labels separated by `\|` (2–100 labels, ≤ 80 chars each) | `an aluminium drink can\|a glass bottle` |

Returns the top 5 matches:

```json
[{ "label": "an aluminium drink can", "score": 0.81 }, { "label": "a glass bottle", "score": 0.07 }]
```

## Deploy

1. Create a new Space at <https://huggingface.co/new-space> → SDK **Gradio** → hardware **CPU basic (free)**.
2. Upload `app.py`, `requirements.txt` and this `README.md` (or `git push` them to the Space repo).
3. Wait for the build, then try it in the Space's web page.
4. Put the Space id (`owner/space-name`) in `web/.env.local` as `VITE_HF_SPACE_ID`.

Free Spaces sleep after ~48 h without traffic; the first request after that takes 30–60 s.

## Run locally (optional)

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install gradio -r requirements.txt
python app.py
```
