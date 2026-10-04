// Lets `node --test` load the app's TypeScript directly (Node strips the
// types): resolves extensionless relative imports like "../billing/plans" to
// their .ts file, the way the bundler does.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!relative || /\.[cm]?[jt]sx?$/.test(specifier)) {
      return nextResolve(specifier, context);
    }
    for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
      try {
        return nextResolve(candidate, context);
      } catch {
        // Try the next candidate.
      }
    }
    return nextResolve(specifier, context);
  },
});
