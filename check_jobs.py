from backend.database.db import SessionLocal
from backend.database.models import Job

db = SessionLocal()
jobs = db.query(Job).filter(Job.owner_user_id == 'usr_56c3ca62035a').limit(5).all()
for j in jobs:
    desc = (j.description or '')
    print(f'id={j.id}  title={repr(j.title)}')
    print(f'  desc_len={len(desc)}  desc_start={repr(desc[:150])}')
    print()
db.close()
