import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface CreateWishlistBody {
  name: string;
  person: string;
  occasion: string;
  date: string;
  avatarUrl?: string;
}

interface UpdateWishlistBody {
  name?: string;
  person?: string;
  occasion?: string;
  date?: string;
  avatarUrl?: string;
}

export function registerWishlistRoutes(app: App, fastify: FastifyInstance) {
  // GET /api/wishlists - List all wishlists
  fastify.get('/api/wishlists', {
    schema: {
      description: 'List all wishlists',
      tags: ['wishlists'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              person: { type: 'string' },
              occasion: { type: 'string' },
              date: { type: 'string' },
              avatarUrl: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, async () => {
    app.logger.info('Listing all wishlists');
    const wishlists = await app.db.select().from(schema.wishlists);
    app.logger.info({ count: wishlists.length }, 'Wishlists retrieved');
    return wishlists;
  });

  // POST /api/wishlists - Create a new wishlist
  fastify.post('/api/wishlists', {
    schema: {
      description: 'Create a new wishlist',
      tags: ['wishlists'],
      body: {
        type: 'object',
        required: ['name', 'person', 'occasion', 'date'],
        properties: {
          name: { type: 'string' },
          person: { type: 'string' },
          occasion: { type: 'string' },
          date: { type: 'string' },
          avatarUrl: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            person: { type: 'string' },
            occasion: { type: 'string' },
            date: { type: 'string' },
            avatarUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateWishlistBody }>, reply: FastifyReply) => {
    const { name, person, occasion, date, avatarUrl } = request.body;
    app.logger.info({ name, person, occasion }, 'Creating new wishlist');

    try {
      const result = await app.db
        .insert(schema.wishlists)
        .values({
          id: crypto.randomUUID(),
          name,
          person,
          occasion,
          date,
          avatarUrl: avatarUrl || null,
        })
        .returning();

      const wishlist = result[0];
      app.logger.info({ id: wishlist.id }, 'Wishlist created successfully');
      reply.status(201);
      return wishlist;
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to create wishlist');
      throw error;
    }
  });

  // GET /api/wishlists/:id - Get a single wishlist by ID
  fastify.get('/api/wishlists/:id', {
    schema: {
      description: 'Get a single wishlist by ID',
      tags: ['wishlists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            person: { type: 'string' },
            occasion: { type: 'string' },
            date: { type: 'string' },
            avatarUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ id }, 'Getting wishlist');

    const wishlist = await app.db.query.wishlists.findFirst({
      where: eq(schema.wishlists.id, id),
    });

    if (!wishlist) {
      app.logger.warn({ id }, 'Wishlist not found');
      return reply.status(404).send({ error: 'Wishlist not found' });
    }

    app.logger.info({ id }, 'Wishlist retrieved successfully');
    return wishlist;
  });

  // PUT /api/wishlists/:id - Update a wishlist by ID
  fastify.put('/api/wishlists/:id', {
    schema: {
      description: 'Update a wishlist by ID',
      tags: ['wishlists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          person: { type: 'string' },
          occasion: { type: 'string' },
          date: { type: 'string' },
          avatarUrl: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            person: { type: 'string' },
            occasion: { type: 'string' },
            date: { type: 'string' },
            avatarUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateWishlistBody }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const updates = request.body;
    app.logger.info({ id, updates }, 'Updating wishlist');

    try {
      const result = await app.db
        .update(schema.wishlists)
        .set(updates)
        .where(eq(schema.wishlists.id, id))
        .returning();

      if (result.length === 0) {
        app.logger.warn({ id }, 'Wishlist not found for update');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      app.logger.info({ id }, 'Wishlist updated successfully');
      return result[0];
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to update wishlist');
      throw error;
    }
  });

  // DELETE /api/wishlists/:id - Delete a wishlist by ID
  fastify.delete('/api/wishlists/:id', {
    schema: {
      description: 'Delete a wishlist by ID',
      tags: ['wishlists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ id }, 'Deleting wishlist');

    try {
      const result = await app.db
        .delete(schema.wishlists)
        .where(eq(schema.wishlists.id, id))
        .returning();

      if (result.length === 0) {
        app.logger.warn({ id }, 'Wishlist not found for deletion');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      app.logger.info({ id }, 'Wishlist deleted successfully');
      return { message: 'Wishlist deleted successfully' };
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete wishlist');
      throw error;
    }
  });

  // POST /api/avatars/upload - Upload an avatar image
  fastify.post('/api/avatars/upload', {
    schema: {
      description: 'Upload an avatar image file',
      tags: ['avatars'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        413: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Uploading avatar');

    try {
      const data = await request.file({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
      if (!data) {
        app.logger.warn('No file provided in avatar upload');
        return reply.status(400).send({ error: 'No file provided' });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        app.logger.warn({ err }, 'Avatar file too large');
        return reply.status(413).send({ error: 'File too large' });
      }

      const key = `avatars/${Date.now()}-${data.filename}`;
      const uploadedKey = await app.storage.upload(key, buffer);
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      app.logger.info({ key: uploadedKey }, 'Avatar uploaded successfully');
      return { url };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to upload avatar');
      throw error;
    }
  });
}
