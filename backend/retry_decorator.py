import asyncio
import logging
import random
from functools import wraps
from typing import Callable, Any, Tuple, Type

logger = logging.getLogger("retry_decorator")

def async_retry(
    retries: int = 3, 
    backoff_in_seconds: float = 1.0, 
    exceptions: Tuple[Type[BaseException], ...] = (Exception,)
):
    """
    Decorator for retrying asynchronous functions with exponential backoff and jitter.
    """
    def decorator(func: Callable[..., Any]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            attempt = 0
            while True:
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt > retries:
                        logger.error(f"Function {func.__name__} failed after {retries} retries. Error: {e}")
                        raise e
                    
                    # Exponential backoff with jitter
                    sleep_time = (backoff_in_seconds * (2 ** (attempt - 1))) + random.uniform(0, 0.5)
                    logger.warning(
                        f"Function {func.__name__} raised error: {e}. "
                        f"Retrying attempt {attempt}/{retries} in {sleep_time:.2f} seconds..."
                    )
                    await asyncio.sleep(sleep_time)
        return wrapper
    return decorator
