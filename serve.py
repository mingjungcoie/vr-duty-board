# 執行：python serve.py
import json
import os
import re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BLOCK_ID = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
ROOT = os.path.dirname(os.path.abspath(__file__))


def clean_plan(data):
    if not isinstance(data, dict):
        raise ValueError
    raw_blocks = data.get("blocks")
    if not isinstance(raw_blocks, list) or len(raw_blocks) > 40:
        raise ValueError
    blocks = []
    seen = set()
    for item in raw_blocks:
        if not isinstance(item, dict):
            raise ValueError
        block_id = item.get("id")
        if not isinstance(block_id, str) or not BLOCK_ID.fullmatch(block_id) or block_id in seen:
            raise ValueError
        seen.add(block_id)
        rect = {key: float(item[key]) for key in ("left", "top", "width", "height")}
        if not all(0 <= rect[key] <= 100 for key in rect):
            raise ValueError
        if rect["width"] < 4 or rect["height"] < 4:
            raise ValueError
        label = str(item.get("label") or "").strip()[:40] or "未命名"
        blocks.append({"id": block_id, "label": label, **rect})
    raw_tasks = data.get("tasks", {})
    if not isinstance(raw_tasks, dict) or len(raw_tasks) > 100:
        raise ValueError
    tasks = {}
    for name, ids in raw_tasks.items():
        task = str(name).strip()[:80]
        if not task or task in tasks or not isinstance(ids, list) or len(ids) > 40:
            raise ValueError
        picked = []
        for block_id in ids:
            if not isinstance(block_id, str) or block_id not in seen:
                raise ValueError
            if block_id not in picked:
                picked.append(block_id)
        tasks[task] = picked
    return {"blocks": blocks, "tasks": tasks}


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/hotspots":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 100000:
            self.send_error(400)
            return
        try:
            clean = clean_plan(json.loads(self.rfile.read(length).decode("utf-8")))
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            self.send_error(400)
            return
        dest = os.path.join(ROOT, "src", "hotspots.json")
        with open(dest, "w", encoding="utf-8") as handle:
            json.dump(clean, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
