export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  store: string;
  storeUrl: string;
  imageUrl: string;
  status: 'available' | 'claimed';
  notes?: string;
};

export type Wishlist = {
  id: string;
  name: string;
  person: string;
  occasion: string;
  date: string; // ISO
  emoji: string;
  itemCount: number;
  claimedCount: number;
  avatarUrl?: string;
  items: WishlistItem[];
  childProfile?: {
    age: number;
    clothingSize: string;
    shoeSize: string;
    favoriteColors: string[]; // hex color strings
    currentInterests: string;
  };
};

export const PLACEHOLDER_WISHLISTS: Wishlist[] = [
  {
    id: '1',
    name: "Emma's Birthday",
    person: 'Emma',
    occasion: 'Birthday',
    date: '2025-08-15',
    emoji: '',
    itemCount: 6,
    claimedCount: 2,
    childProfile: {
      age: 8,
      clothingSize: '7/8',
      shoeSize: 'Kids 3',
      favoriteColors: ['#E8866A', '#9B8EC4', '#7BAE8A'],
      currentInterests: "She's really into art, building sets, and anything with animals right now.",
    },
    items: [
      {
        id: 'i1',
        name: 'LEGO Botanical Collection — Wildflower Bouquet',
        price: 59.99,
        store: 'LEGO',
        storeUrl: 'https://www.lego.com',
        imageUrl: 'https://picsum.photos/seed/lego1/400/400',
        status: 'available',
        notes: 'She loves building sets. This one is age 8+.',
      },
      {
        id: 'i2',
        name: 'Kindle Kids — 2024 Edition',
        price: 109.99,
        store: 'Amazon',
        storeUrl: 'https://www.amazon.com',
        imageUrl: 'https://picsum.photos/seed/kindle1/400/400',
        status: 'claimed',
        notes: 'Any color is fine.',
      },
      {
        id: 'i3',
        name: 'Melissa & Doug Wooden Art Easel',
        price: 79.99,
        store: 'Target',
        storeUrl: 'https://www.target.com',
        imageUrl: 'https://picsum.photos/seed/easel1/400/400',
        status: 'available',
      },
      {
        id: 'i4',
        name: 'Roller Skates — Size 3',
        price: 44.99,
        store: "Dick's Sporting Goods",
        storeUrl: 'https://www.dickssportinggoods.com',
        imageUrl: 'https://picsum.photos/seed/skates1/400/400',
        status: 'available',
        notes: 'She wears a kids size 3. Pink or purple preferred.',
      },
      {
        id: 'i5',
        name: 'Gravity Maze Marble Run Logic Game',
        price: 34.99,
        store: 'ThinkFun',
        storeUrl: 'https://www.thinkfun.com',
        imageUrl: 'https://picsum.photos/seed/maze1/400/400',
        status: 'claimed',
      },
      {
        id: 'i6',
        name: 'Watercolor Paint Set — 48 Colors',
        price: 24.99,
        store: 'Michaels',
        storeUrl: 'https://www.michaels.com',
        imageUrl: 'https://picsum.photos/seed/paint1/400/400',
        status: 'available',
        notes: 'Professional grade if possible.',
      },
    ],
  },
  {
    id: '2',
    name: "Noah's Christmas",
    person: 'Noah',
    occasion: 'Christmas',
    date: '2025-12-25',
    emoji: '',
    itemCount: 5,
    claimedCount: 1,
    childProfile: {
      age: 10,
      clothingSize: '10/12',
      shoeSize: 'Kids 5',
      favoriteColors: ['#4A7C5F', '#2C3B32', '#D4A853'],
      currentInterests: 'Obsessed with space, Minecraft, and electronics. Loves anything he can take apart.',
    },
    items: [
      {
        id: 'i7',
        name: 'Nintendo Switch Sports Bundle',
        price: 299.99,
        store: 'Best Buy',
        storeUrl: 'https://www.bestbuy.com',
        imageUrl: 'https://picsum.photos/seed/switch1/400/400',
        status: 'claimed',
        notes: 'The bundle with the sports game included.',
      },
      {
        id: 'i8',
        name: 'Minecraft Dungeons Hero Edition',
        price: 29.99,
        store: 'Nintendo eShop',
        storeUrl: 'https://www.nintendo.com',
        imageUrl: 'https://picsum.photos/seed/minecraft1/400/400',
        status: 'available',
      },
      {
        id: 'i9',
        name: 'Snap Circuits Jr. Electronics Kit',
        price: 39.99,
        store: 'Amazon',
        storeUrl: 'https://www.amazon.com',
        imageUrl: 'https://picsum.photos/seed/circuits1/400/400',
        status: 'available',
        notes: 'He loves science experiments.',
      },
      {
        id: 'i10',
        name: 'Cozy Fleece Hoodie — Age 10',
        price: 34.99,
        store: 'Gap Kids',
        storeUrl: 'https://www.gap.com',
        imageUrl: 'https://picsum.photos/seed/hoodie1/400/400',
        status: 'available',
        notes: 'Size 10-12. Navy or forest green.',
      },
      {
        id: 'i11',
        name: 'Illustrated Encyclopedia of Space',
        price: 19.99,
        store: 'Barnes & Noble',
        storeUrl: 'https://www.barnesandnoble.com',
        imageUrl: 'https://picsum.photos/seed/space1/400/400',
        status: 'available',
      },
    ],
  },
  {
    id: '3',
    name: "Lily's Graduation",
    person: 'Lily',
    occasion: 'Graduation',
    date: '2025-06-07',
    emoji: '',
    itemCount: 4,
    claimedCount: 3,
    childProfile: {
      age: 17,
      clothingSize: 'S/M',
      shoeSize: "Women's 7",
      favoriteColors: ['#E8866A', '#F5F0E8', '#D4A853'],
      currentInterests: 'Starting college in the fall. Into photography, journaling, and minimalist design.',
    },
    items: [
      {
        id: 'i12',
        name: 'Apple AirPods Pro (2nd Gen)',
        price: 249.00,
        store: 'Apple',
        storeUrl: 'https://www.apple.com',
        imageUrl: 'https://picsum.photos/seed/airpods1/400/400',
        status: 'claimed',
      },
      {
        id: 'i13',
        name: 'Fjallraven Kanken Backpack — Peach Pink',
        price: 110.00,
        store: 'REI',
        storeUrl: 'https://www.rei.com',
        imageUrl: 'https://picsum.photos/seed/backpack1/400/400',
        status: 'claimed',
      },
      {
        id: 'i14',
        name: 'Moleskine Classic Notebook — Large',
        price: 22.99,
        store: 'Moleskine',
        storeUrl: 'https://www.moleskine.com',
        imageUrl: 'https://picsum.photos/seed/notebook1/400/400',
        status: 'claimed',
        notes: 'Ruled, hardcover, black.',
      },
      {
        id: 'i15',
        name: 'Polaroid Now+ Camera — White',
        price: 149.99,
        store: 'Polaroid',
        storeUrl: 'https://www.polaroid.com',
        imageUrl: 'https://picsum.photos/seed/polaroid1/400/400',
        status: 'available',
      },
    ],
  },
];
