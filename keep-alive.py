import os
import sys
import subprocess
import time
import signal

# Double fork to daemonize
if os.fork() > 0:
    sys.exit(0)
os.setsid()
if os.fork() > 0:
    sys.exit(0)

os.chdir('/home/z/my-project')
with open('dev.log', 'w') as f:
    os.dup2(f.fileno(), 1)
    os.dup2(f.fileno(), 2)
os.close(0)

while True:
    proc = subprocess.Popen(
        ['bunx', 'next', 'dev', '-p', '3000'],
        env={**os.environ, 'DATABASE_URL': 'postgresql://z@localhost:5432/taskflow'},
    )
    proc.wait()
    time.sleep(2)
