#!/bin/bash
cd /home/z/my-project
DATABASE_URL="postgresql://z@localhost:5432/taskflow" nohup bunx next dev -p 3000 > dev.log 2>&1 &
echo $!
echo 'Dev server starting in background...'
