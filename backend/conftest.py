"""Pytest root configuration and environment setup."""
import sys
from pathlib import Path

# Guarantee that the backend directory is always the primary entry in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
