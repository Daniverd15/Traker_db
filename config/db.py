from pymongo import MongoClient
from pymongo.database import Database

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "valorant_tracker"


def get_db() -> Database:
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]
