import { describe, test, expect } from "bun:test";
import { api, expectStatus, createTestFile } from "./helpers";

describe("API Integration Tests", () => {
  let wishlistId: string;

  // ==================== Wishlist CRUD Tests ====================

  test("List all wishlists", async () => {
    const res = await api("/api/wishlists");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Create a wishlist", async () => {
    const res = await api("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Birthday Wishlist",
        person: "John Doe",
        occasion: "Birthday",
        date: "2026-06-15",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    wishlistId = data.id;
    expect(data.name).toBe("Birthday Wishlist");
    expect(data.person).toBe("John Doe");
    expect(data.occasion).toBe("Birthday");
    expect(data.id).toBeDefined();
  });

  test("Get a wishlist by ID", async () => {
    const res = await api(`/api/wishlists/${wishlistId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(wishlistId);
    expect(data.name).toBe("Birthday Wishlist");
  });

  test("Update a wishlist", async () => {
    const res = await api(`/api/wishlists/${wishlistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Birthday Wishlist",
        occasion: "Special Birthday",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.name).toBe("Updated Birthday Wishlist");
    expect(data.occasion).toBe("Special Birthday");
  });

  test("Delete a wishlist", async () => {
    const res = await api(`/api/wishlists/${wishlistId}`, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
  });

  test("Get deleted wishlist returns 404", async () => {
    const res = await api(`/api/wishlists/${wishlistId}`);
    await expectStatus(res, 404);
  });

  // ==================== Negative Cases: Wishlist ====================

  test("Create wishlist with missing required field returns 400", async () => {
    const res = await api("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Incomplete Wishlist",
        person: "Jane Doe",
        // Missing 'occasion' and 'date'
      }),
    });
    await expectStatus(res, 400);
  });

  test("Get non-existent wishlist returns 404", async () => {
    const res = await api("/api/wishlists/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Update non-existent wishlist returns 404", async () => {
    const res = await api("/api/wishlists/00000000-0000-0000-0000-000000000000", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    await expectStatus(res, 404);
  });

  test("Delete non-existent wishlist returns 404", async () => {
    const res = await api("/api/wishlists/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    await expectStatus(res, 404);
  });

  test("Create wishlist with only name returns 400", async () => {
    const res = await api("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Partial Wishlist" }),
    });
    await expectStatus(res, 400);
  });

  // ==================== Avatar Upload Tests ====================

  test("Upload avatar image file", async () => {
    const form = new FormData();
    form.append("file", createTestFile("test-avatar.txt", "avatar content", "text/plain"));
    const res = await api("/api/avatars/upload", {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.url).toBeDefined();
    expect(typeof data.url).toBe("string");
  });

  test("Upload without file returns 400", async () => {
    const form = new FormData();
    const res = await api("/api/avatars/upload", {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 400);
  });

  // ==================== Additional Wishlist Tests ====================

  test("Create wishlist with avatar URL", async () => {
    const res = await api("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Anniversary Wishlist",
        person: "Couple",
        occasion: "Anniversary",
        date: "2026-07-20",
        avatarUrl: "https://example.com/avatar.jpg",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  test("Update wishlist with partial fields", async () => {
    // Create a wishlist first
    const createRes = await api("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Wishlist",
        person: "Test Person",
        occasion: "Test Occasion",
        date: "2026-08-01",
      }),
    });
    const createdData = await createRes.json();
    const testWishlistId = createdData.id;

    // Update only the name
    const updateRes = await api(`/api/wishlists/${testWishlistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name Only" }),
    });
    await expectStatus(updateRes, 200);
    const updatedData = await updateRes.json();
    expect(updatedData.name).toBe("Updated Name Only");
    expect(updatedData.person).toBe("Test Person"); // Original value preserved

    // Clean up
    await api(`/api/wishlists/${testWishlistId}`, { method: "DELETE" });
  });
});
