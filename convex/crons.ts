import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "prune webhook events",
  { hours: 24 },
  internal.webhooks.pruneEvents,
  {},
);

crons.interval("prune old edit jobs", { hours: 24 }, internal.edits.pruneOld, {});

export default crons;
