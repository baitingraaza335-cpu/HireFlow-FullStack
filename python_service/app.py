"""Optional Python microservice used by HireFlow to estimate skill overlap."""
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="HireFlow Skill Match API", version="1.0.0")

class MatchRequest(BaseModel):
    candidate_skills: str = Field(default="", max_length=1000)
    required_skills: list[str] = Field(default_factory=list, max_length=50)

@app.get("/health")
def health():
    return {"status": "ok", "service": "HireFlow Python Skill Match"}

@app.post("/match-score")
def match_score(payload: MatchRequest):
    candidate = {item.strip().lower() for item in payload.candidate_skills.replace(",", " ").split() if item.strip()}
    required = {item.strip().lower() for item in payload.required_skills if item.strip()}
    if not required:
        return {"match_score": 0, "matched_skills": [], "missing_skills": []}
    matched = sorted(candidate.intersection(required))
    missing = sorted(required.difference(candidate))
    return {"match_score": round(len(matched) / len(required) * 100), "matched_skills": matched, "missing_skills": missing}
