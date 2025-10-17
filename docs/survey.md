import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... your existing tables (qa, questions, etc.) ...

  // Survey Form Definitions
  surveyForms: defineTable({
    // Basic Info
    title: v.string(),
    slug: v.string(), // URL-friendly identifier
    description: v.optional(v.string()),
    
    // Configuration
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("closed")
    ),
    locale: v.string(), // "en", "vi", etc.
    category: v.optional(v.string()), // "feedback", "registration", "assessment"
    
    // Form Structure
    questions: v.array(v.object({
      id: v.string(), // Unique within form (e.g., "q1", "email")
      type: v.union(
        v.literal("text"),
        v.literal("textarea"),
        v.literal("email"),
        v.literal("number"),
        v.literal("radio"),
        v.literal("checkbox"),
        v.literal("select"),
        v.literal("rating"),
        v.literal("date"),
        v.literal("file")
      ),
      label: v.string(),
      placeholder: v.optional(v.string()),
      helpText: v.optional(v.string()),
      required: v.boolean(),
      order: v.number(), // Display order
      
      // Validation
      validation: v.optional(v.object({
        minLength: v.optional(v.number()),
        maxLength: v.optional(v.number()),
        min: v.optional(v.number()),
        max: v.optional(v.number()),
        pattern: v.optional(v.string()), // Regex pattern
        errorMessage: v.optional(v.string()),
      })),
      
      // Options for select/radio/checkbox
      options: v.optional(v.array(v.object({
        value: v.string(),
        label: v.string(),
        order: v.number(),
      }))),
      
      // Conditional Logic
      conditionalLogic: v.optional(v.object({
        show_if: v.object({
          questionId: v.string(),
          operator: v.union(
            v.literal("equals"),
            v.literal("not_equals"),
            v.literal("contains"),
            v.literal("greater_than"),
            v.literal("less_than")
          ),
          value: v.union(v.string(), v.number(), v.boolean()),
        }),
      })),
    })),
    
    // Settings
    settings: v.object({
      allowMultipleSubmissions: v.boolean(),
      requireAuthentication: v.boolean(),
      showProgressBar: v.boolean(),
      shuffleQuestions: v.boolean(),
      submitButtonText: v.string(),
      successMessage: v.string(),
      redirectUrl: v.optional(v.string()),
      collectIpAddress: v.boolean(),
      sendConfirmationEmail: v.boolean(),
      notifyOnSubmission: v.boolean(),
      notificationEmails: v.optional(v.array(v.string())),
    }),
    
    // Scheduling
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()),
    
    // Analytics
    responseCount: v.number(),
    viewCount: v.number(),
    
    // Version Control
    version: v.number(),
    previousVersionId: v.optional(v.id("surveyForms")),
    
    // Metadata
    createdBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_locale", ["locale"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"])
    .searchIndex("search_by_title", {
      searchField: "title",
      filterFields: ["status", "locale", "category"],
    }),

  // Survey Responses
  surveyResponses: defineTable({
    formId: v.id("surveyForms"),
    formVersion: v.number(), // Track which version was answered
    formSlug: v.string(), // Denormalized for easier querying
    
    // Respondent Info
    userId: v.optional(v.string()),
    sessionId: v.string(), // Anonymous identifier
    email: v.optional(v.string()),
    
    // Response Data
    answers: v.array(v.object({
      questionId: v.string(),
      questionLabel: v.string(), // Denormalized for reporting
      questionType: v.string(),
      value: v.union(
        v.string(),
        v.number(),
        v.boolean(),
        v.array(v.string()), // For checkbox
        v.null()
      ),
      answeredAt: v.number(),
    })),
    
    // Submission Details
    status: v.union(
      v.literal("draft"), // Partial submission
      v.literal("completed"),
      v.literal("abandoned")
    ),
    
    // Progress Tracking
    completionPercentage: v.number(),
    timeSpentSeconds: v.optional(v.number()),
    
    // Technical Metadata
    ipAddressHash: v.optional(v.string()), // Hashed for privacy
    userAgent: v.optional(v.string()),
    locale: v.string(),
    
    // Timestamps
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    lastModifiedAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_form_slug", ["formSlug"])
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_submitted_at", ["submittedAt"])
    .index("by_form_and_status", ["formId", "status"])
    .index("by_form_and_submitted", ["formId", "submittedAt"]),

  // Survey Analytics (Pre-aggregated)
  surveyAnalytics: defineTable({
    formId: v.id("surveyForms"),
    formSlug: v.string(),
    
    // Time Period
    period: v.union(
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    periodStart: v.number(), // Timestamp
    periodEnd: v.number(),
    
    // Metrics
    metrics: v.object({
      totalViews: v.number(),
      totalResponses: v.number(),
      completedResponses: v.number(),
      abandonedResponses: v.number(),
      averageCompletionTime: v.number(), // In seconds
      conversionRate: v.number(), // Percentage
      uniqueRespondents: v.number(),
    }),
    
    // Question-level Analytics
    questionStats: v.optional(v.array(v.object({
      questionId: v.string(),
      questionLabel: v.string(),
      responseCount: v.number(),
      skipCount: v.number(),
      averageValue: v.optional(v.number()), // For numeric/rating
      topAnswers: v.optional(v.array(v.object({
        value: v.string(),
        count: v.number(),
        percentage: v.number(),
      }))),
    }))),
    
    // Demographics (if collected)
    demographics: v.optional(v.object({
      locales: v.array(v.object({
        locale: v.string(),
        count: v.number(),
      })),
    })),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_period", ["period", "periodStart"])
    .index("by_form_and_period", ["formId", "period", "periodStart"]),

  // Survey Templates (Reusable form templates)
  surveyTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    thumbnail: v.optional(v.string()),
    
    // Template Structure (same as surveyForms.questions)
    questions: v.array(v.object({
      id: v.string(),
      type: v.string(),
      label: v.string(),
      placeholder: v.optional(v.string()),
      helpText: v.optional(v.string()),
      required: v.boolean(),
      order: v.number(),
      validation: v.optional(v.any()), // Use v.any() for complex nested objects
      options: v.optional(v.any()),
      conditionalLogic: v.optional(v.any()),
    })),
    
    defaultSettings: v.object({
      allowMultipleSubmissions: v.boolean(),
      requireAuthentication: v.boolean(),
      showProgressBar: v.boolean(),
      submitButtonText: v.string(),
      successMessage: v.string(),
    }),
    
    // Metadata
    usageCount: v.number(),
    isPublic: v.boolean(),
    tags: v.array(v.string()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"])
    .searchIndex("search_by_name", {
      searchField: "name",
      filterFields: ["category", "isPublic"],
    }),

  // Survey Field Options (For dynamic dropdowns/selects)
  surveyFieldOptions: defineTable({
    key: v.string(), // e.g., "countries", "job_titles", "industries"
    locale: v.string(),
    options: v.array(v.object({
      value: v.string(),
      label: v.string(),
      order: v.number(),
      metadata: v.optional(v.object({
        icon: v.optional(v.string()),
        description: v.optional(v.string()),
      })),
    })),
    updatedAt: v.number(),
  })
    .index("by_key", ["key", "locale"]),

  // Survey Invitations (For targeted surveys)
  surveyInvitations: defineTable({
    formId: v.id("surveyForms"),
    email: v.string(),
    token: v.string(), // Unique access token
    
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("opened"),
      v.literal("completed"),
      v.literal("expired")
    ),
    
    // Personalization
    recipientName: v.optional(v.string()),
    customMessage: v.optional(v.string()),
    metadata: v.optional(v.object({
      userId: v.optional(v.string()),
      segment: v.optional(v.string()),
    })),
    
    // Tracking
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(),
    
    createdAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"])
    .index("by_expires", ["expiresAt"]),
});