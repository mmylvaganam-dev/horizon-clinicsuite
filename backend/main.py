from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Horizon Clinical Suite Backend",
    version="0.1.0",
    description="Independent backend API for Horizon Clinical Suite migration away from Base44."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "horizon-clinicsuite-backend"}
