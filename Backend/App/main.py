from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from App.database import Base, engine
from App.routers.auth import router as auth_router
from App.routers.users import router as users_router
from App.routers.threads import router as threads_router
from App.routers.comments import router as comments_router
from App.routers.votes import router as votes_router
from App.routers.admin import router as admin_router

app = FastAPI(title="Community Forum API")

# Học tập: mở CORS để chạy HTML local file / Live Server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tạo bảng (học tập).
# Nếu DB cũ thiếu cột do thay đổi model, hãy DROP TABLE hoặc dùng migration (Alembic).
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(threads_router)
app.include_router(comments_router)
app.include_router(votes_router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {"message": "Community Forum API is running"}
