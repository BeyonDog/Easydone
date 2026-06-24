from pathlib import Path
p = Path(r"D:\AIWorkspace\easydone\scripts\export_task_testcases.py")
t = p.read_text(encoding="utf-8")
bad = "tasks[tid] = {`n            \"task_id\": tid,`n            \"name\": row[1],"
good = "tasks[tid] = {\n            \"task_id\": tid,\n            \"name\": row[1],"
if bad in t:
    t = t.replace(bad, good)
else:
    bad2 = 'tasks[tid] = {\n            "name": row[1],'
    good2 = 'tasks[tid] = {\n            "task_id": tid,\n            "name": row[1],'
    t = t.replace(bad2, good2)
p.write_text(t, encoding="utf-8")
print("ok")
