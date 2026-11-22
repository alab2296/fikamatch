# 15 - Photo upload and ordering

Signed-in people can now add, order and remove their profile photos.

1. `POST /photos/me` takes the image itself as the request body (JPEG, PNG or WebP, up to 5 MB). The file's first bytes must match the type it claims, so a renamed text file is turned away.
2. Each person can keep up to 6 photos. A seventh gets a clear error and nothing is stored.
3. `GET /photos/me` lists them in order, each with a short-lived signed link (10 minutes).
4. `PUT /photos/me/order` takes the full list of photo ids in the new order. It must be exactly your own photos, no more, no less.
5. `DELETE /photos/me/:id` removes the row and the stored file for real, and closes the gap in the numbering.
6. `GET /photos/:key` serves the image only when the signature in the link is valid and not expired.
