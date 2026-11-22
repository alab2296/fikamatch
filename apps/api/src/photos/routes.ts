import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import type { PhotoStorage } from "../storage/provider.js";
import {
  addPhoto,
  listPhotos,
  removePhoto,
  reorderPhotos,
  type Photo,
} from "./repository.js";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const URL_TTL_SECONDS = 600;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** The file's own first bytes must agree with the type the client claims. */
export function matchesType(data: Buffer, contentType: string): boolean {
  switch (contentType) {
    case "image/jpeg":
      return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    case "image/png":
      return data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    case "image/webp":
      return (
        data.length > 12 &&
        data.subarray(0, 4).toString("latin1") === "RIFF" &&
        data.subarray(8, 12).toString("latin1") === "WEBP"
      );
    default:
      return false;
  }
}

const orderBody = z.object({ ids: z.array(z.string().uuid()).max(6) });
const idParam = z.object({ id: z.string().uuid() });

export function registerPhotoRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
  storage: PhotoStorage,
) {
  const guard = requireAuth(jwtSecret);
  const client = db as Parameters<typeof listPhotos>[0];

  const view = (p: Photo) => ({
    id: p.id,
    position: p.position,
    url: storage.signedUrl(p.storageKey, URL_TTL_SECONDS),
  });

  // Own scope so the raw-image body parser only applies to these routes.
  app.register(async (scope) => {
    scope.addContentTypeParser(
      Object.keys(EXTENSIONS),
      { parseAs: "buffer", bodyLimit: MAX_PHOTO_BYTES },
      (_req, body, done) => done(null, body),
    );

    scope.get("/photos/me", { preHandler: guard }, async (req) => ({
      photos: (await listPhotos(client, req.auth!.sub)).map(view),
    }));

    scope.post("/photos/me", { preHandler: guard }, async (req, reply) => {
      const contentType = (req.headers["content-type"] ?? "").split(";")[0]!.trim();
      const data = req.body;
      if (!(contentType in EXTENSIONS) || !Buffer.isBuffer(data) || data.length === 0)
        throw new ApiError(415, "unsupported_media");
      if (!matchesType(data, contentType)) throw new ApiError(415, "unsupported_media");

      const userId = req.auth!.sub;
      const key = `${userId}/${randomUUID()}.${EXTENSIONS[contentType]}`;
      await storage.put(key, data, contentType);
      let photo: Photo | null = null;
      try {
        photo = await addPhoto(client, userId, key, contentType);
      } catch (err) {
        await storage.delete(key);
        // a parallel upload took the same position
        if ((err as { code?: string }).code === "23505")
          throw new ApiError(409, "conflict");
        throw err;
      }
      if (!photo) {
        await storage.delete(key);
        throw new ApiError(409, "too_many_photos");
      }
      return reply.status(201).send(view(photo));
    });

    scope.put("/photos/me/order", { preHandler: guard }, async (req) => {
      const parsed = orderBody.safeParse(req.body);
      if (!parsed.success) throw new ApiError(400, "validation");
      const userId = req.auth!.sub;
      if (!(await reorderPhotos(client, userId, parsed.data.ids)))
        throw new ApiError(400, "validation");
      return { photos: (await listPhotos(client, userId)).map(view) };
    });

    scope.delete("/photos/me/:id", { preHandler: guard }, async (req, reply) => {
      const params = idParam.safeParse(req.params);
      if (!params.success) throw new ApiError(404, "not_found");
      const removed = await removePhoto(client, req.auth!.sub, params.data.id);
      if (!removed) throw new ApiError(404, "not_found");
      await storage.delete(removed.storageKey);
      return reply.status(204).send();
    });

    // Signed link target: no sign-in needed, the signature is the permission.
    scope.get("/photos/:key", async (req, reply) => {
      const { key } = req.params as { key: string };
      const { expires, sig } = req.query as { expires?: string; sig?: string };
      if (!expires || !sig || !storage.verifyUrl(key, Number(expires), sig))
        throw new ApiError(403, "forbidden");
      const object = await storage.get(key);
      if (!object) throw new ApiError(404, "not_found");
      return reply
        .header("content-type", object.contentType)
        .header("x-content-type-options", "nosniff")
        .header("cache-control", "private, max-age=300")
        .send(object.data);
    });
  });
}
