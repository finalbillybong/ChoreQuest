import time
from collections import defaultdict
from fastapi import HTTPException


class SlidingWindowRateLimiter:
    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int):
        now = time.time()
        cutoff = now - window_seconds
        self._windows[key] = [t for t in self._windows[key] if t > cutoff]
        if len(self._windows[key]) >= max_requests:
            retry_after = int(self._windows[key][0] + window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers={"Retry-After": str(retry_after)},
            )
        self._windows[key].append(now)


rate_limiter = SlidingWindowRateLimiter()
