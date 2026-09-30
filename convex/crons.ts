import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "prune webhook events",
  { hours: 24 },
  internal.webhooks.pruneEvents,
  {},
);

export default crons;
