CV_PARSING_SCHEMA = {
    "type": "object",
    "properties": {
        "personal_info": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "city": {"type": "string"},
                "country": {"type": "string"},
                "nationality": {"type": "string"},
                "visa_status": {
                    "type": "string",
                    "enum": ["CITIZEN", "PERMANENT_RESIDENT", "WORK_PERMIT", "STUDENT_VISA", "SPONSORED_VISA",
                             "NO_WORK_AUTHORIZATION", "OTHER", "UNKNOWN"]
                },
                "work_preference": {
                    "type": "string",
                    "enum": ["ONSITE", "HYBRID", "REMOTE", "FLEXIBLE", "UNKNOWN"]
                },
                "open_to_remote": {"type": "boolean"},
                "open_to_relocation": {"type": "boolean"},
                "linkedin_url": {"type": "string"},
                "github_url": {"type": "string"},
                "portfolio_url": {"type": "string"},
                "summary": {"type": "string"}
            },
            "required": ["first_name", "last_name"]
        },
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "company": {"type": "string"},
                    "title": {"type": "string"},
                    "employment_type": {"type": "string"},
                    "location": {"type": "string"},
                    "start_date": {"type": "string", "description": "Format: YYYY-MM or YYYY-MM-DD"},
                    "end_date": {"type": "string",
                                 "description": "Format: YYYY-MM or YYYY-MM-DD. Leave empty if current."},
                    "is_current": {"type": "boolean"},
                    "description": {"type": "string"}
                },
                "required": ["company", "title"]
            }
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string"},
                    "degree": {"type": "string"},
                    "field_of_study": {"type": "string"},
                    "grade": {"type": "string"},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "description": {"type": "string"}
                },
                "required": ["institution"]
            }
        },
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "level": {
                        "type": "string",
                        "enum": ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT", "UNKNOWN"]
                    },
                    "years_of_experience": {"type": "number"}
                },
                "required": ["name"]
            }
        },
        "languages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "code": {"type": "string", "description": "ISO language code, e.g. en, de, ru"},
                    "level": {
                        "type": "string",
                        "enum": ["BASIC", "INTERMEDIATE", "ADVANCED", "FLUENT", "NATIVE", "UNKNOWN"]
                    }
                },
                "required": ["name", "level"]
            }
        },
        "certifications": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "issuer": {"type": "string"},
                    "issue_date": {"type": "string"},
                    "expiration_date": {"type": "string"}
                },
                "required": ["name"]
            }
        }
    },
    "required": ["personal_info", "experience", "education", "skills", "languages", "certifications"]
}

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