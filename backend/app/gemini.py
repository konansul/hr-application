import json
import logging
from typing import Any, Dict, Optional

from openai import OpenAI
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)


class GeminiClient:
    def __init__(self, model: Optional[str] = None):
        self.model = model or settings.GEMINI_MODEL

    def generate_text(
            self,
            prompt: str,
            temperature: float = 0.2,
            max_output_tokens: int = 2048,
    ) -> str:

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_output_tokens,
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.exception("OpenRouter text generation failed")
            raise RuntimeError(f"OpenRouter API error: {str(e)}")

    def generate_json(
            self,
            prompt: str,
            schema: Dict[str, Any],
            temperature: float = 0.1,
    ) -> Dict[str, Any]:

        system_prompt = (
            "You are an expert HR AI. You must analyze the provided CV and Job Description. "
            "You must respond ONLY with a valid JSON object. "
            f"The JSON must strictly follow this exact schema:\n{json.dumps(schema)}"
        )

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                response_format={"type": "json_object"}
            )

            result_text = response.choices[0].message.content

            return json.loads(result_text)

        except json.JSONDecodeError as e:
            logger.exception("Failed to parse JSON from OpenRouter")
            raise RuntimeError(f"Model returned invalid JSON: {str(e)}")
        except Exception as e:
            logger.exception("OpenRouter JSON generation failed")
            raise RuntimeError(f"OpenRouter JSON API error: {str(e)}")