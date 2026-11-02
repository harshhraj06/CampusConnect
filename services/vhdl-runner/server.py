#!/usr/bin/env python3
"""Local-only, containerized GHDL VHDL-2008 execution service."""

import json
import os
import re
import shutil
import signal
import subprocess
import tempfile
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = os.environ.get("VHDL_RUNNER_HOST", "127.0.0.1")
PORT = int(os.environ.get("VHDL_RUNNER_PORT", "2001"))
MAX_SOURCE_BYTES = 100_000
MAX_REQUEST_BYTES = 110_000
MAX_OUTPUT_BYTES = 64_000
COMPILE_TIMEOUT_SECONDS = 10
RUN_TIMEOUT_SECONDS = 3
MAX_CONCURRENT_JOBS = 2
JOB_SEMAPHORE = threading.BoundedSemaphore(MAX_CONCURRENT_JOBS)
TB_ENTITY = re.compile(r"\bentity\s+tb\b", re.IGNORECASE)


def limited_process(command: list[str], cwd: str, timeout: int) -> dict[str, Any]:
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )
    captured: dict[str, bytearray] = {"stdout": bytearray(), "stderr": bytearray()}
    output_limited = threading.Event()

    def read_stream(name: str, stream: Any) -> None:
        while True:
            chunk = stream.read(4096)
            if not chunk:
                return
            remaining = MAX_OUTPUT_BYTES - len(captured[name])
            if remaining > 0:
                captured[name].extend(chunk[:remaining])
            if len(chunk) > remaining:
                output_limited.set()
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                return

    readers = [
        threading.Thread(target=read_stream, args=("stdout", process.stdout), daemon=True),
        threading.Thread(target=read_stream, args=("stderr", process.stderr), daemon=True),
    ]
    for reader in readers:
        reader.start()

    timed_out = False
    try:
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()
    for reader in readers:
        reader.join(timeout=1)

    return {
        "stdout": captured["stdout"].decode("utf-8", errors="replace"),
        "stderr": captured["stderr"].decode("utf-8", errors="replace"),
        "exit_code": process.returncode,
        "timed_out": timed_out,
        "output_limited": output_limited.is_set(),
    }


def execute(source: str) -> tuple[int, dict[str, Any]]:
    source_bytes = source.encode("utf-8")
    if not source.strip():
        return HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_source", "message": "VHDL source is required."}
    if len(source_bytes) > MAX_SOURCE_BYTES:
        return HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "source_too_large", "message": "VHDL source exceeds 100 KB."}
    if not TB_ENTITY.search(source):
        return HTTPStatus.BAD_REQUEST, {"ok": False, "error": "missing_testbench", "message": "The submitted source must define a testbench entity named tb."}
    if not JOB_SEMAPHORE.acquire(blocking=False):
        return HTTPStatus.TOO_MANY_REQUESTS, {"ok": False, "error": "busy", "message": "The VHDL runner is busy; try again shortly."}

    workdir = tempfile.mkdtemp(prefix="campusconnect-vhdl-", dir="/tmp")
    os.chmod(workdir, 0o700)
    try:
        source_path = Path(workdir) / "design.vhd"
        source_path.write_text(source, encoding="utf-8")
        compile_result = limited_process(["ghdl", "-a", "--std=08", "design.vhd"], workdir, COMPILE_TIMEOUT_SECONDS)
        if compile_result["timed_out"]:
            return HTTPStatus.GATEWAY_TIMEOUT, {"ok": False, "error": "compile_timeout", "compile": compile_result, "simulation": None}
        if compile_result["output_limited"]:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": "compile_output_limit", "compile": compile_result, "simulation": None}
        if compile_result["exit_code"] != 0:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": "compile_failed", "compile": compile_result, "simulation": None}

        elaborate_result = limited_process(["ghdl", "-e", "--std=08", "tb"], workdir, COMPILE_TIMEOUT_SECONDS)
        compile_result["stdout"] += elaborate_result["stdout"]
        compile_result["stderr"] += elaborate_result["stderr"]
        compile_result["exit_code"] = elaborate_result["exit_code"]
        if elaborate_result["timed_out"]:
            return HTTPStatus.GATEWAY_TIMEOUT, {"ok": False, "error": "elaboration_timeout", "compile": compile_result, "simulation": None}
        if elaborate_result["output_limited"] or len(compile_result["stdout"].encode()) > MAX_OUTPUT_BYTES or len(compile_result["stderr"].encode()) > MAX_OUTPUT_BYTES:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": "compile_output_limit", "compile": compile_result, "simulation": None}
        if elaborate_result["exit_code"] != 0:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": "compile_failed", "compile": compile_result, "simulation": None}

        simulation_result = limited_process(["ghdl", "-r", "--std=08", "tb"], workdir, RUN_TIMEOUT_SECONDS)
        if simulation_result["timed_out"]:
            return HTTPStatus.GATEWAY_TIMEOUT, {"ok": False, "error": "simulation_timeout", "compile": compile_result, "simulation": simulation_result}
        if simulation_result["output_limited"]:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": "simulation_output_limit", "compile": compile_result, "simulation": simulation_result}
        if simulation_result["exit_code"] != 0:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": "simulation_failed", "compile": compile_result, "simulation": simulation_result}
        return HTTPStatus.OK, {"ok": True, "compile": compile_result, "simulation": simulation_result}
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
        JOB_SEMAPHORE.release()


class Handler(BaseHTTPRequestHandler):
    server_version = "CampusConnectVhdlRunner/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def respond(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        if self.path != "/execute":
            self.respond(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self.respond(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "invalid_request_size"})
            return
        try:
            payload = json.loads(self.rfile.read(content_length))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.respond(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
            return
        if not isinstance(payload, dict) or set(payload) != {"source"} or not isinstance(payload["source"], str):
            self.respond(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_request", "message": "Expected exactly {source: string}."})
            return
        status, result = execute(payload["source"])
        self.respond(status, result)

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self.respond(HTTPStatus.OK, {"ok": True})
        else:
            self.respond(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
