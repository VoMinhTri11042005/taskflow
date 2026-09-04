#!/bin/bash
cd /home/z/my-project
unset DATABASE_URL
exec bunx next dev -p 3000
