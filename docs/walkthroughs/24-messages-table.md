# 24 - Messages table

Chat needs somewhere to keep messages. This step adds only the storage, no endpoints yet.

1. A `messages` table holds who sent it, who gets it, the text, when it was sent and when it was read.
2. The text must be 1 to 2000 characters, and you cannot message yourself. The database enforces both.
3. One index covers a whole conversation between two people, whichever of them sent each message.
4. `listHistory` returns the newest messages first and pages backwards with `before`.
5. If a user is deleted, their messages go too (part of the real-delete promise).
