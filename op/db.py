"""
Database connections for open prescribing
"""
import redis
r = redis.StrictRedis(host='localhost', port=6379, db=0)
