/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as admin from "../admin.js";
import type * as embeddings from "../embeddings.js";
import type * as feedback from "../feedback.js";
import type * as landingContent from "../landingContent.js";
import type * as mutations_conversations from "../mutations/conversations.js";
import type * as mutations_qa from "../mutations/qa.js";
import type * as mutations_search from "../mutations/search.js";
import type * as qa from "../qa.js";
import type * as queries_conversations from "../queries/conversations.js";
import type * as queries_documents from "../queries/documents.js";
import type * as queries_qa from "../queries/qa.js";
import type * as queries_search from "../queries/search.js";
import type * as questionRequests from "../questionRequests.js";
import type * as questions from "../questions.js";
import type * as search from "../search.js";
import type * as searchUtils from "../searchUtils.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  admin: typeof admin;
  embeddings: typeof embeddings;
  feedback: typeof feedback;
  landingContent: typeof landingContent;
  "mutations/conversations": typeof mutations_conversations;
  "mutations/qa": typeof mutations_qa;
  "mutations/search": typeof mutations_search;
  qa: typeof qa;
  "queries/conversations": typeof queries_conversations;
  "queries/documents": typeof queries_documents;
  "queries/qa": typeof queries_qa;
  "queries/search": typeof queries_search;
  questionRequests: typeof questionRequests;
  questions: typeof questions;
  search: typeof search;
  searchUtils: typeof searchUtils;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
