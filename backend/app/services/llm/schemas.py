SCREENING_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "number"},
        "decision": {"type": "string"},
        "summary": {"type": "string"},

        "must_have": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "requirement": {"type": "string"},
                    "status": {"type": "string"},
                    "evidence": {"type": "string"},
                },
                "required": ["requirement", "status"]
            }
        },
        "nice_to_have": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "requirement": {"type": "string"},
                    "status": {"type": "string"},
                    "evidence": {"type": "string"},
                },
                "required": ["requirement", "status"]
            }
        },

        "matched_skills": {"type": "array", "items": {"type": "string"}},
        "missing_skills": {"type": "array", "items": {"type": "string"}},

        "recommendations": {"type": "array", "items": {"type": "string"}},
        "interview_questions": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},

        "profile": {
            "type": "object",
            "properties": {
                "skills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "years": {"type": "number"},
                        },
                        "required": ["name"]
                    }
                },
                "experience_years": {"type": "number"},
            },
            "required": ["skills"]
        },
    },
    "required": ["score", "decision", "summary", "must_have", "nice_to_have", "profile"]
}

CV_IMPROVEMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "overall_score": {"type": "integer"},
        "summary": {"type": "string"},
        "strengths": {
            "type": "array",
            "items": {"type": "string"}
        },
        "weaknesses": {
            "type": "array",
            "items": {"type": "string"}
        },
        "missing_keywords": {
            "type": "array",
            "items": {"type": "string"}
        },
        "improvements": {
            "type": "array",
            "items": {"type": "string"}
        },
        "improved_summary": {"type": "string"},
        "rewritten_bullets": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "improved": {"type": "string"}
                },
                "required": ["original", "improved"]
            }
        }
    },
    "required": [
        "overall_score",
        "summary",
        "strengths",
        "weaknesses",
        "missing_keywords",
        "improvements",
        "improved_summary",
        "rewritten_bullets"
    ]
}