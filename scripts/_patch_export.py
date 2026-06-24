from pathlib import Path
p = Path(r"D:\AIWorkspace\easydone\scripts\export_task_testcases.py")
t = p.read_text(encoding="utf-8")
old = "tasks[tid] = {\n            \"name\": row[1],"
new = "tasks[tid] = {\n            \"task_id\": tid,\n            \"name\": row[1],"
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("patched")
