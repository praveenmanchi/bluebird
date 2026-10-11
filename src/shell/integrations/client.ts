// Shell side of Settings › Integrations: the two sandbox calls, typed.
import type { RpcClient } from '@shared/bridge'
import { INTEGRATIONS_MSG, testMessage, type ConnectionTestResult, type IntegrationId, type IntegrationSettings, type IntegrationValues } from '@shared/integrations'

export interface IntegrationsApi {
  load: () => Promise<IntegrationSettings>
  save: (section: IntegrationId, values: IntegrationValues) => Promise<IntegrationValues>
  /** Tries the connection with the form's current (unsaved) values; only for TESTABLE_INTEGRATIONS. */
  test?: (section: IntegrationId, values: IntegrationValues) => Promise<ConnectionTestResult>
}

/** A test reaches the service, which can be slow; long enough for a proxy + Jira round trip. */
const TEST_TIMEOUT_MS = 30_000

export function integrationsApi(client: RpcClient): IntegrationsApi {
  return {
    load: () => client.call<IntegrationSettings>(INTEGRATIONS_MSG.get),
    save: (section, values) => client.call<IntegrationValues>(INTEGRATIONS_MSG.save, { section, values }),
    test: (section, values) => client.call<ConnectionTestResult>(testMessage(section), values, TEST_TIMEOUT_MS),
  }
}
