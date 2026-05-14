from __future__ import annotations
import re


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text).strip()


def build_job_refinement_prompt(title: str, description: str, region: str | None = None) -> str:
    location_context = f"- Location/Region: {region}" if region else ""
    clean_description = strip_html(description)
    return f"""You are an expert HR Assistant and Technical Recruiter. Your task is to refine, enhance, and finalize job descriptions to attract top candidates.

Input:
- Job Title: {title}
{location_context}
- Draft Description: {clean_description}

Instructions:
1. Analyze the draft description.
2. If it is too short, expand it professionally by adding relevant sections.
3. If it is too long, improve clarity, fix grammar and style, structure it logically.
4. Add any standard responsibilities or requirements typical for this role if missing.
5. Consider the region ({region or 'Remote'}) for location-specific context where relevant.
6. Make the text clear, professional, and appealing to top candidates.

Output format rules (strictly follow):
- Return ONLY valid HTML. No surrounding <html>, <head>, or <body> tags.
- Allowed tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- Use <h2> for main section headings: "About the Role", "Responsibilities", "Requirements", "What We Offer"
- Use <ul><li> for bullet-point lists (responsibilities, requirements, benefits)
- Use <p> for introductory or closing paragraphs
- Use <strong> to highlight key terms or important requirements
- Do NOT use Markdown syntax (no **, no ##, no -)
- Do NOT wrap the output in code fences or backticks
- Do NOT add any commentary outside the HTML

Example structure:
<h2>About the Role</h2>
<p>We are looking for a skilled [Title] to join our team...</p>
<h2>Responsibilities</h2>
<ul>
  <li>Lead and deliver...</li>
  <li>Collaborate with...</li>
</ul>
<h2>Requirements</h2>
<ul>
  <li><strong>3+ years</strong> of experience in...</li>
  <li>Proficiency in...</li>
</ul>
<h2>What We Offer</h2>
<ul>
  <li>Competitive salary</li>
  <li>Flexible working hours</li>
</ul>
"""
