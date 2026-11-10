"""Build the local index before the tests if it does not exist yet (fresh clone)."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def pytest_configure(config):
    if not (ROOT / "index" / "meta.json").exists():
        subprocess.run([sys.executable, str(ROOT / "ingest.py"), "--backend", "local"], cwd=ROOT, check=True,
                       capture_output=True)
