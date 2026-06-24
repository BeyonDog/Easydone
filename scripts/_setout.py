from pathlib import Path
p=Path(r"D:\AIWorkspace\easydone\scripts\export_task_testcases.py")
t=p.read_text(encoding="utf-8")
t=t.replace('OUT_PATH = Path.home() / "Desktop" / "任务全量用例-老任务首胜BP.xlsx"', 'OUT_PATH = Path.home() / "Desktop" / "任务全量用例-老任务首胜BP-v2.xlsx"')
p.write_text(t,encoding="utf-8")
