import type { Config, Context } from "@netlify/functions";
import {
  readQuoteEnvironment,
  type QuoteRuntimeContext,
} from "./_shared/environment";
import {
  createChariotNotifier,
  createNtfyNotifier,
} from "./_shared/notifications";
import { createQuoteRepository } from "./_shared/quote-repository";
import { handleQuoteRequest } from "./_shared/submit-quote-handler";
import type { SafeLogger } from "./_shared/quote-types";

const safeLogger: SafeLogger = {
  info(event, fields) {
    console.info(JSON.stringify({ event, ...fields }));
  },
  warn(event, fields) {
    console.warn(JSON.stringify({ event, ...fields }));
  },
  error(event, fields) {
    console.error(JSON.stringify({ event, ...fields }));
  },
};

export default async function submitQuote(
  request: Request,
  context: Context,
): Promise<Response> {
  const environment = readQuoteEnvironment();
  const runtimeContext: QuoteRuntimeContext = {
    deployContext: context.deploy?.context ?? "",
    published: context.deploy?.published ?? false,
    siteId: context.site?.id ?? "",
    ip: context.ip ?? "",
    requestId: context.requestId ?? crypto.randomUUID(),
  };

  let repository:
    | ReturnType<typeof createQuoteRepository>
    | undefined;
  const getRepository = () => {
    repository ??= createQuoteRepository(
      environment.supabaseUrl,
      environment.supabaseSecretKey,
    );
    return repository;
  };

  return handleQuoteRequest(request, runtimeContext, environment, {
    repository: {
      createQuote(input) {
        return getRepository().createQuote(input);
      },
      recordNotification(delivery) {
        return getRepository().recordNotification(delivery);
      },
    },
    notifiers: [
      createChariotNotifier({
        enabled: environment.chariotEnabled,
        endpoint: environment.chariotEndpoint,
        token: environment.chariotToken,
      }),
      createNtfyNotifier({
        enabled: environment.ntfyEnabled,
        baseUrl: environment.ntfyBaseUrl,
        topic: environment.ntfyTopic,
        accessToken: environment.ntfyAccessToken,
      }),
    ],
    logger: safeLogger,
  });
}

export const config: Config = {
  path: "/api/quote",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["domain", "ip"],
    windowLimit: 5,
    windowSize: 60,
  },
};
