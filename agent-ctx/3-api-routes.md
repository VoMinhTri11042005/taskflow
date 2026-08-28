# Task 3: API Route Files

## Completed
All 8 API route files created and passing lint:

1. **`/api/activity-logs/route.ts`** — GET (optional userId filter, includes user name+color) / POST (track login/logout/page_view)
2. **`/api/polls/route.ts`** — GET (all polls with options+vote counts) / POST (admin only, creates Poll + PollOption records)
3. **`/api/polls/[id]/route.ts`** — GET (single poll with voter names) / PUT (admin update title/desc/status) / DELETE (admin delete)
4. **`/api/polls/[id]/vote/route.ts`** — POST (cast vote, deletes old vote if exists due to unique constraint, returns updated poll)
5. **`/api/auth/change-password/route.ts`** — POST (user changes own password, validates current with compareSync)
6. **`/api/auth/reset-password/route.ts`** — POST (admin resets member password, creates notification)
7. **`/api/auth/update-profile/route.ts`** — PUT (update user name, also syncs TeamMember name by email)
8. **`/api/members/credentials/route.ts`** — GET (admin only, returns { email, name })

All files use try/catch, NextResponse.json, Vietnamese error messages, bcryptjs for password ops, session cookie parsing for admin checks.
