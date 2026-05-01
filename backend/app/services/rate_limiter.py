from slowapi import Limiter
from slowapi.util import get_remote_address

# Define a shared limiter instance
# This is imported by routers and the main app to keep state consistent
limiter = Limiter(key_func=get_remote_address)
