"""Scan2Recycle classifier: CLIP zero-shot image classification behind a Gradio API.

The web app sends a photo plus the list of item labels (from the item_types table),
and gets back the top matches with scores. Labels live in the database, so adding
an item never requires redeploying this Space.
"""

import gradio as gr
from PIL import Image
from transformers import pipeline

MODEL_ID = "openai/clip-vit-base-patch32"
PROMPT_PREFIX = "a photo of "
LABEL_SEPARATOR = "|"
MAX_LABELS = 100
MAX_LABEL_LENGTH = 80
TOP_K = 5

classifier = pipeline("zero-shot-image-classification", model=MODEL_ID)


def parse_labels(labels_csv: str) -> list[str]:
    """Split, trim and de-duplicate labels, keeping their original order."""
    labels = [label.strip() for label in (labels_csv or "").split(LABEL_SEPARATOR)]
    unique = list(dict.fromkeys(label for label in labels if label))
    if len(unique) < 2:
        raise gr.Error("Send at least two labels separated by '|'.")
    if len(unique) > MAX_LABELS:
        raise gr.Error(f"Too many labels (max {MAX_LABELS}).")
    if any(len(label) > MAX_LABEL_LENGTH for label in unique):
        raise gr.Error(f"Each label must be at most {MAX_LABEL_LENGTH} characters.")
    return unique


def predict(image: Image.Image | None, labels_csv: str) -> list[dict]:
    if image is None:
        raise gr.Error("No image received.")
    labels = parse_labels(labels_csv)
    prompts = [PROMPT_PREFIX + label for label in labels]
    results = classifier(image.convert("RGB"), candidate_labels=prompts)
    return [
        {"label": r["label"].removeprefix(PROMPT_PREFIX), "score": round(float(r["score"]), 4)}
        for r in results[:TOP_K]
    ]


demo = gr.Interface(
    fn=predict,
    inputs=[
        gr.Image(type="pil", label="Photo"),
        gr.Textbox(
            label="Labels (separated by |)",
            value="an aluminium drink can|a plastic water bottle|a glass bottle|a cardboard box|a banana peel",
        ),
    ],
    outputs=gr.JSON(label="Top matches"),
    title="Scan2Recycle classifier",
    description="Upload a photo and a list of item labels. Returns the closest matches.",
    api_name="predict",
    flagging_mode="never",
)

if __name__ == "__main__":
    demo.launch()
