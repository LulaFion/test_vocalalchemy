"""
GPT-SoVITS API Server Launcher

Manages the lifecycle of the GPT-SoVITS API server subprocess.
"""

import subprocess
import asyncio
import atexit
import signal
import sys
import time
import os
from pathlib import Path
from typing import Optional

from ..config import settings


class GPTSoVITSLauncher:
    """Manages the GPT-SoVITS API server subprocess."""

    def __init__(self):
        self._process: Optional[subprocess.Popen] = None
        self._gptsovits_path = Path(settings.gptsovits_base_path)

    def _get_python_exe(self) -> str:
        """Get the path to the GPT-SoVITS bundled Python runtime."""
        runtime_python = self._gptsovits_path / "runtime" / "python.exe"
        if runtime_python.exists():
            return str(runtime_python)
        return sys.executable

    def is_running(self) -> bool:
        """Check if the GPT-SoVITS process is running."""
        if self._process is None:
            return False
        return self._process.poll() is None

    def start(self) -> bool:
        """Start the GPT-SoVITS API server."""
        if self.is_running():
            print("[GPT-SoVITS] API server is already running")
            return True

        python_exe = self._get_python_exe()
        api_script = self._gptsovits_path / "api_v2.py"
        config_file = self._gptsovits_path / "GPT_SoVITS" / "configs" / "tts_infer.yaml"

        if not api_script.exists():
            print(f"[GPT-SoVITS] Error: api_v2.py not found at {api_script}")
            return False

        cmd = [
            python_exe,
            str(api_script),
            "-a", settings.gptsovits_host,
            "-p", str(settings.gptsovits_port),
            "-c", str(config_file),
        ]

        print(f"[GPT-SoVITS] Starting API server: {' '.join(cmd)}")

        try:
            # Set up environment with UTF-8 encoding for Korean/CJK support
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            env["PYTHONUTF8"] = "1"

            # Start the process with output visible in console
            self._process = subprocess.Popen(
                cmd,
                cwd=str(self._gptsovits_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
                env=env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
            )

            # Register cleanup handler
            atexit.register(self.stop)

            # Start a thread to read and print output
            import threading
            def read_output():
                try:
                    for line in self._process.stdout:
                        print(f"[GPT-SoVITS] {line.rstrip()}")
                except Exception:
                    pass

            output_thread = threading.Thread(target=read_output, daemon=True)
            output_thread.start()

            # Wait a moment for the server to start
            time.sleep(2)

            if self.is_running():
                print(f"[GPT-SoVITS] API server started on http://{settings.gptsovits_host}:{settings.gptsovits_port}")
                return True
            else:
                print("[GPT-SoVITS] API server failed to start")
                return False

        except Exception as e:
            print(f"[GPT-SoVITS] Error starting API server: {e}")
            return False

    def stop(self):
        """Stop the GPT-SoVITS API server."""
        if self._process is None:
            return

        if not self.is_running():
            self._process = None
            return

        print("[GPT-SoVITS] Stopping API server...")

        try:
            if sys.platform == "win32":
                # On Windows, send CTRL+BREAK to the process group
                self._process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                # On Unix, send SIGTERM
                self._process.terminate()

            # Wait for graceful shutdown
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                print("[GPT-SoVITS] Force killing API server...")
                self._process.kill()
                self._process.wait()

            print("[GPT-SoVITS] API server stopped")

        except Exception as e:
            print(f"[GPT-SoVITS] Error stopping API server: {e}")

        self._process = None

    async def wait_for_ready(self, timeout: float = 60.0) -> bool:
        """Wait for the GPT-SoVITS API server to be ready."""
        import httpx

        start_time = time.time()
        url = f"http://{settings.gptsovits_host}:{settings.gptsovits_port}/"

        while time.time() - start_time < timeout:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    response = await client.get(url)
                    if response.status_code < 500:
                        print(f"[GPT-SoVITS] API server is ready")
                        return True
            except Exception:
                pass

            if not self.is_running():
                print("[GPT-SoVITS] API server process died")
                return False

            await asyncio.sleep(1)

        print("[GPT-SoVITS] Timeout waiting for API server")
        return False


# Global launcher instance
gptsovits_launcher = GPTSoVITSLauncher()
