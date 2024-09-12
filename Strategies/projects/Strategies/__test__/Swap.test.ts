import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { SwapClient } from '../contracts/clients/SwapClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: SwapClient;

describe('Swap', () => {
  beforeEach(fixture.beforeEach);

  /* beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;

    appClient = new DcaClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algorand.client.algod
    );

    await appClient.create.createApplication({
      adminAddress: testAccount,
      buyTokenReceiver: testAccount,
      balanceTokenId: 0,
      buyTokenId: 1,
      buyIntervalSeconds: 60,
      targetSpend: 1000,
    });
  }); */

});
