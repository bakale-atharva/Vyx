/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assets from "../assets.js";
import type * as billing from "../billing.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as edits from "../edits.js";
import type * as http from "../http.js";
import type * as imagekit from "../imagekit.js";
import type * as lib_editNaming from "../lib/editNaming.js";
import type * as lib_insertAsset from "../lib/insertAsset.js";
import type * as lib_plans from "../lib/plans.js";
import type * as lib_storedFile from "../lib/storedFile.js";
import type * as lib_validateUpload from "../lib/validateUpload.js";
import type * as lib_waitForReady from "../lib/waitForReady.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assets: typeof assets;
  billing: typeof billing;
  cleanup: typeof cleanup;
  crons: typeof crons;
  edits: typeof edits;
  http: typeof http;
  imagekit: typeof imagekit;
  "lib/editNaming": typeof lib_editNaming;
  "lib/insertAsset": typeof lib_insertAsset;
  "lib/plans": typeof lib_plans;
  "lib/storedFile": typeof lib_storedFile;
  "lib/validateUpload": typeof lib_validateUpload;
  "lib/waitForReady": typeof lib_waitForReady;
  users: typeof users;
  webhooks: typeof webhooks;
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
