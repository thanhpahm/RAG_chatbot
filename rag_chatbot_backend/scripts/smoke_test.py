#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def run_curl(args: list[str], timeout: int = 60) -> tuple[int, str, str]:
    proc = subprocess.run(
        ["curl", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return proc.returncode, proc.stdout, proc.stderr


def curl_json(method: str, url: str, body: dict | None = None) -> tuple[int, dict]:
    args = ["-sS", "-X", method, url, "-w", "\n%{http_code}"]
    if body is not None:
        args.extend(["-H", "Content-Type: application/json", "-d", json.dumps(body)])

    code, stdout, stderr = run_curl(args)
    if code != 0:
        raise RuntimeError(f"curl failed for {method} {url}: {stderr.strip()}")

    split = stdout.rsplit("\n", 1)
    if len(split) != 2:
        raise RuntimeError(f"unexpected response format from {method} {url}: {stdout}")
    raw_body, raw_status = split
    status_code = int(raw_status.strip())
    payload = json.loads(raw_body) if raw_body.strip() else {}
    return status_code, payload


def upload_file(url: str, file_path: Path) -> tuple[int, dict]:
    args = [
        "-sS",
        "-X",
        "POST",
        url,
        "-F",
        f"file=@{file_path}",
        "-w",
        "\n%{http_code}",
    ]
    code, stdout, stderr = run_curl(args)
    if code != 0:
        raise RuntimeError(f"upload failed: {stderr.strip()}")
    raw_body, raw_status = stdout.rsplit("\n", 1)
    return int(raw_status.strip()), json.loads(raw_body)


def stream_chat(url: str, body: dict, timeout: int = 180) -> str:
    args = [
        "-sS",
        "-N",
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
        "-d",
        json.dumps(body),
    ]
    code, stdout, stderr = run_curl(args, timeout=timeout)
    if code != 0:
        raise RuntimeError(f"stream chat failed: {stderr.strip()}")
    if "event: token" not in stdout:
        raise RuntimeError(f"SSE stream missing token events:\n{stdout}")
    if "event: done" not in stdout:
        raise RuntimeError(f"SSE stream missing done event:\n{stdout}")
    return stdout


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG chatbot backend smoke test.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="API base URL")
    parser.add_argument(
        "--poll-timeout-seconds",
        type=int,
        default=120,
        help="Max seconds to wait for document processing",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("[1/8] Health check")
    health_status, health = curl_json("GET", f"{base_url}/health")
    if health_status != 200 or health.get("status") != "ok":
        raise RuntimeError(f"health check failed: {health_status} {health}")

    print("[2/8] Create knowledge base")
    kb_status, kb = curl_json(
        "POST",
        f"{base_url}/api/v1/knowledge-bases",
        {"name": "smoke-kb", "description": "smoke test knowledge base"},
    )
    if kb_status not in (200, 201):
        raise RuntimeError(f"create KB failed: {kb_status} {kb}")
    kb_id = kb["id"]

    print("[3/8] Upload sample document")
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as fp:
        fp.write(
            "RAG means retrieval augmented generation. "
            "It combines retrieval from a knowledge base with LLM generation."
        )
        temp_path = Path(fp.name)

    try:
        doc_status, doc = upload_file(
            f"{base_url}/api/v1/knowledge-bases/{kb_id}/documents",
            temp_path,
        )
        if doc_status not in (200, 201):
            raise RuntimeError(f"upload document failed: {doc_status} {doc}")
        doc_id = doc["id"]

        print("[4/8] Poll document status until COMPLETED")
        started = time.time()
        final_doc = doc
        while True:
            status_code, current = curl_json("GET", f"{base_url}/api/v1/documents/{doc_id}")
            if status_code != 200:
                raise RuntimeError(f"get document failed: {status_code} {current}")
            final_doc = current
            upload_status = current.get("upload_status")
            print(f"  -> status={upload_status}")
            if upload_status == "COMPLETED":
                break
            if upload_status == "FAILED":
                raise RuntimeError(f"document processing failed: {current}")
            if time.time() - started > args.poll_timeout_seconds:
                raise RuntimeError("timed out waiting for document processing")
            time.sleep(2)

        print("[5/8] Create conversation")
        conv_status, conv = curl_json(
            "POST",
            f"{base_url}/api/v1/conversations",
            {"title": "smoke chat"},
        )
        if conv_status not in (200, 201):
            raise RuntimeError(f"create conversation failed: {conv_status} {conv}")
        conversation_id = conv["id"]

        print("[6/8] Send message (SSE)")
        stream_output = stream_chat(
            f"{base_url}/api/v1/conversations/{conversation_id}/messages",
            {"content": "What is RAG?", "knowledge_base_id": kb_id},
        )
        print("  -> stream OK")

        print("[7/8] Read messages and citations")
        msg_status, messages = curl_json("GET", f"{base_url}/api/v1/conversations/{conversation_id}/messages")
        if msg_status != 200 or not isinstance(messages, list) or len(messages) < 2:
            raise RuntimeError(f"messages check failed: {msg_status} {messages}")

        bot_messages = [m for m in messages if m.get("sender_type") == "BOT"]
        if not bot_messages:
            raise RuntimeError(f"no bot message found: {messages}")
        bot_message_id = bot_messages[-1]["id"]

        citations_status, citations = curl_json(
            "GET", f"{base_url}/api/v1/messages/{bot_message_id}/citations"
        )
        if citations_status != 200:
            raise RuntimeError(f"citations fetch failed: {citations_status} {citations}")

        print("[8/8] Send feedback")
        feedback_status, feedback = curl_json(
            "PATCH",
            f"{base_url}/api/v1/messages/{bot_message_id}/feedback",
            {"rating": 1, "feedback_text": "smoke test feedback"},
        )
        if feedback_status != 200 or feedback.get("ok") is not True:
            raise RuntimeError(f"feedback update failed: {feedback_status} {feedback}")

        print("\nSmoke test passed.")
        print(f"KB ID: {kb_id}")
        print(f"Document ID: {doc_id}")
        print(f"Conversation ID: {conversation_id}")
        print(f"Bot Message ID: {bot_message_id}")
        print(f"Citations count: {len(citations) if isinstance(citations, list) else 0}")
        print(f"SSE output size: {len(stream_output)} chars")
        return 0
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nSmoke test failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
