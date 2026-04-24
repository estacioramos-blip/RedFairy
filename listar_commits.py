"""
listar_commits.py

Lista os ultimos 30 commits para identificar quando o bug foi
introduzido.
"""
import subprocess

print("=" * 70)
print("ULTIMOS 30 COMMITS (mais recente primeiro)")
print("=" * 70)

r = subprocess.run(
    ["git", "log", "--oneline", "-30", "--pretty=format:%h  %ci  %s"],
    capture_output=True, text=True, encoding='utf-8'
)
print(r.stdout)
print()

print("=" * 70)
print("ESTATISTICA DE CADA COMMIT (linhas mudadas)")
print("=" * 70)
r = subprocess.run(
    ["git", "log", "--stat", "-15", "--pretty=format:%n%h  %s"],
    capture_output=True, text=True, encoding='utf-8'
)
print(r.stdout)
