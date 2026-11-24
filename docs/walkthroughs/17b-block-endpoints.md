# 17 - Block endpoints

People can now block and unblock each other over the API.

1. `POST /blocks` with `{ "userId": "..." }` blocks that person. Blocking twice is fine. You cannot block yourself, and a person who does not exist gives a 404.
2. `GET /blocks` lists the people you have blocked. There is no way to see who has blocked you, so a block stays invisible to the other side.
3. `DELETE /blocks/:userId` removes your own block only. It cannot undo a block someone else made.
4. The blocked person is hidden from you and you from them through `isBlockedEitherWay`, which the feed, swipes and chat will use in later steps.
5. The user id always comes from the token.
