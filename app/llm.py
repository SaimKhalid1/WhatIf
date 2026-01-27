from __future__ import annotations
from typing import Optional
import json
import httpx
from .config import settings

SYSTEM_PROMPT = (
    "You are writing a concise executive explanation of decision scenarios. "
    "STRICT RULES: Use ONLY the provided JSON. Do not invent outcomes. "
    "Do not predict the future. Do not tell the user what to do. "
    "You may say 'If X matters most…' and describe tradeoffs. "
    "Output under 140 words."
)

async def governed_summary(model_output: dict) -> Optional[str]:
    if not settings.openai_api_key:
        return None

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(model_output)},
        ],
        "temperature": 0.2,
    }

    async with httpx.AsyncClient(timeout=25) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()
