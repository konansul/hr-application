from sqlalchemy import inspect

from backend.database.db import Base, engine
import backend.database.models  # noqa: F401


def main():
    print("Creating tables...")
    print("Metadata tables BEFORE create_all:", list(Base.metadata.tables.keys()))

    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    print("Metadata tables AFTER create_all:", list(Base.metadata.tables.keys()))
    print("Tables in database:", inspector.get_table_names())
    print("Tables created successfully")


if __name__ == "__main__":
    main()