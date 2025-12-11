import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const sections = await ctx.db.query("sections").collect();
        return sections.sort((a, b) => a.order - b.order);
    },
});

export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query("sections")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
    },
});

export const get = query({
    args: { id: v.id("sections") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

export const create = mutation({
    args: {
        name_vi: v.string(),
        name_en: v.optional(v.string()),
        slug: v.string(),
        order: v.number(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        // Check if slug exists
        const existing = await ctx.db
            .query("sections")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (existing) {
            throw new Error("Slug already exists");
        }

        const id = await ctx.db.insert("sections", {
            name_vi: args.name_vi,
            name_en: args.name_en,
            slug: args.slug,
            order: args.order,
            description: args.description,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return id;
    },
});

export const update = mutation({
    args: {
        id: v.id("sections"),
        name_vi: v.optional(v.string()),
        name_en: v.optional(v.string()),
        slug: v.optional(v.string()),
        order: v.optional(v.number()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        const { id, ...updates } = args;

        // If slug is being updated, check for uniqueness
        if (updates.slug) {
            const existing = await ctx.db
                .query("sections")
                .withIndex("by_slug", (q) => q.eq("slug", updates.slug))
                .filter(q => q.neq(q.field("_id"), id))
                .first();

            if (existing) {
                throw new Error("Slug already exists");
            }
        }

        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: {
        id: v.id("sections"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        // Unlink questions from this section
        const questions = await ctx.db
            .query("qa")
            .withIndex("by_section_id", (q) => q.eq("section_id", args.id))
            .collect();

        for (const q of questions) {
            await ctx.db.patch(q._id, { section_id: undefined });
        }

        await ctx.db.delete(args.id);
    },
});
