#!/bin/bash
cd /home/z/my-project
while true; do
  DATABASE_URL='postgresql://z@localhost:5432/taskflow' bunx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "Server died at $(date), restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
