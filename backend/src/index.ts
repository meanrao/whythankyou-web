import { createApplication } from "@specific-dev/framework";
import { eq } from "drizzle-orm";
import * as schema from './db/schema/schema.js';
import { registerWishlistRoutes } from './routes/wishlists.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable storage for avatar uploads
app.withStorage();

// Seed initial wishlist data
const seedWishlists = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: "Emma's Birthday",
    person: 'Emma',
    occasion: 'Birthday',
    date: '2025-08-15',
    avatarUrl: 'https://picsum.photos/seed/emma/200/200',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: "Noah's Christmas",
    person: 'Noah',
    occasion: 'Christmas',
    date: '2025-12-25',
    avatarUrl: 'https://picsum.photos/seed/noah/200/200',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: "Lily's Graduation",
    person: 'Lily',
    occasion: 'Graduation',
    date: '2025-06-07',
    avatarUrl: 'https://picsum.photos/seed/lily/200/200',
  },
];

async function seedDatabase() {
  app.logger.info('Seeding database with initial wishlist data');
  for (const wishlist of seedWishlists) {
    const existing = await app.db.query.wishlists.findFirst({
      where: eq(schema.wishlists.id, wishlist.id),
    });

    if (!existing) {
      await app.db.insert(schema.wishlists).values(wishlist);
      app.logger.info({ id: wishlist.id, name: wishlist.name }, 'Seeded wishlist');
    } else {
      app.logger.debug({ id: wishlist.id }, 'Wishlist already exists, skipping');
    }
  }
  app.logger.info('Database seeding completed');
}

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerWishlistRoutes(app, app.fastify);

await seedDatabase();
await app.run();
app.logger.info('Application running');
