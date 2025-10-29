from pymongo import MongoClient
from config import MONGO_URI, DB_NAME

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    print("MongoDB connected successfully")
except Exception as e:
    print("Error connecting to MongoDB:", e)
