import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

export async function checkIsAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return false;
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
  
  return user?.role === "admin";
}

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    
    console.log("Identity:", JSON.stringify(identity, null, 2));
    console.log("Admin Config:", { adminEmail, adminUsername });

    let isAdmin = false;
    if (adminEmail && identity.email === adminEmail) isAdmin = true;
    if (adminUsername && (identity.nickname === adminUsername || identity.name === adminUsername)) isAdmin = true;

    const role = isAdmin ? "admin" : "user";
    console.log("Calculated Role:", role);

    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      // Also update role if it doesn't match the current configuration
      const updates: any = {};
      if (user.name !== identity.name) updates.name = identity.name;
      if (user.email !== identity.email) updates.email = identity.email;
      if (user.username !== identity.nickname) updates.username = identity.nickname;
      if (user.image !== identity.pictureUrl) updates.image = identity.pictureUrl;
      if (user.role !== role) updates.role = role;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
      }
      return user._id;
    }

    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name,
      email: identity.email,
      username: identity.nickname,
      image: identity.pictureUrl,
      role: role,
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    return user;
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    
    return user?.role === "admin";
  },
});
