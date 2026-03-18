from app.infrastructure.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = inspector.get_columns('interview_reports')
for column in columns:
    print(column['name'])
