import { useAtomValue } from "@effect/atom-react";
import { type ServerConfig, ServerNpmReleaseError } from "@t3tools/contracts";
import { CLI_RELEASE_CHECKSUMS_FILE, cliReleaseTagUrl } from "@t3tools/shared/cliRelease";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { AsyncResult, Atom } from "effect/reactivity";

import { environmentSummaries } from "./presentation";
import { primaryEnvironmentIdAtom } from "./primaryEnvironment";
import { serverEnvironment } from "./server";

const isServerNpmReleaseError = Schema.is(ServerNpmReleaseError);

function unsupportedLookup(config: ServerConfig | null): ServerNpmReleaseError | null {
  if (config === null) {
    return new ServerNpmReleaseError({ reason: "Connect to this server to check releases." });
  }
  return config.environment.capabilities.npmReleaseLookup === true
    ? null
    : new ServerNpmReleaseError({
        reason: "This server does not support registry lookups. Update it before switching tracks.",
      });
}

export function npmReleaseFailureMessage(cause: Cause.Cause<unknown>): string {
  const error = Option.getOrUndefined(Cause.findErrorOption(cause));
  return isServerNpmReleaseError(error)
    ? error.message
    : "Could not check this environment's npm registry. Check the connection and registry settings.";
}

export const npmReleaseAtom = Atom.family((spec: string) =>
  Atom.make((get) => {
    const primary = get(primaryEnvironmentIdAtom);
    // With the desktop's local server turned off there is no primary, so a connected server answers.
    const candidates =
      primary === null ? get(environmentSummaries.connectedEnvironmentIdsAtom) : [primary];
    const environmentId =
      candidates.find(
        (id) => unsupportedLookup(get(serverEnvironment.configValueAtom(id))) === null,
      ) ?? candidates[0];
    if (environmentId === undefined) {
      return Effect.fail(
        new ServerNpmReleaseError({ reason: "Connect to a server to check releases." }),
      );
    }
    const unsupported = unsupportedLookup(get(serverEnvironment.configValueAtom(environmentId)));
    if (unsupported !== null) return Effect.fail(unsupported);
    return get
      .result(serverEnvironment.npmRelease({ environmentId, input: { spec } }))
      .pipe(
        Effect.map((release) =>
          release === null
            ? null
            : { version: release.version, databaseMigration: release.databaseMigration },
        ),
      );
  }).pipe(Atom.withLabel(`npm-release:${spec}`)),
);

// Fork: the fork publishes no npm package. Servers update from its GitHub release, which is
// installable once the checksums the installer verifies against are uploaded.
export const npmReleasePublishedAtom = Atom.family((version: string) =>
  Atom.make(
    Effect.gen(function* () {
      const response = yield* HttpClient.get(cliReleaseTagUrl(version));
      if (response.status === 404) return false;
      const body = yield* HttpClientResponse.filterStatusOk(response).pipe(
        Effect.flatMap((ok) => ok.json),
      );
      return (
        typeof body === "object" &&
        body !== null &&
        "assets" in body &&
        Array.isArray(body.assets) &&
        body.assets.some(
          (asset: unknown) =>
            typeof asset === "object" &&
            asset !== null &&
            "name" in asset &&
            asset.name === CLI_RELEASE_CHECKSUMS_FILE,
        )
      );
    }).pipe(
      // Tracing headers would make the browser send a CORS preflight.
      Effect.provideService(HttpClient.TracerPropagationEnabled, false),
      Effect.provide(FetchHttpClient.layer),
    ),
  ).pipe(
    Atom.withRefresh("5 minutes"),
    Atom.keepAlive,
    Atom.withLabel(`npm-release-published:${version}`),
  ),
);

const NO_VERSION_ATOM = Atom.make(AsyncResult.success(false)).pipe(
  Atom.withLabel("npm-release-published:none"),
);

export function useNpmReleasePublished(version: string | null): boolean {
  const result = useAtomValue(version ? npmReleasePublishedAtom(version) : NO_VERSION_ATOM);
  return AsyncResult.getOrElse(result, () => false);
}
