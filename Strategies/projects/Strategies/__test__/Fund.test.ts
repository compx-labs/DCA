import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { FundClient } from '../contracts/clients/FundClient';
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: FundClient;
let user: TransactionSignerAccount;
let orchestrator: TransactionSignerAccount;

describe('Fund', () => {
  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;

    appClient = new FundClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algorand.client.algod
    );
    orchestrator = testAccount;

    user = await fixture.context.generateAccount({ initialFunds: algokit.algos(10) });
    await algokit.ensureFunded(
      {
        accountToFund: user,
        fundingSource: await algokit.getDispenserAccount(algorand.client.algod, algorand.client.kmd!),
        minSpendingBalance: algokit.algos(20),
      },
      algorand.client.algod,
    )

    await appClient.create.createApplication({
      orchestratorAddress: orchestrator.addr,
    }, { sender: user });
  });

  test('Add funds', async () => {
    const { algorand } = fixture;
    const { appAddress } = await appClient.appClient.getAppReference();

    const fundAmount = 10n * 10n ** 6n;

    const payTxn = await algorand.transactions.payment({
      amount: algokit.algos(10),
      receiver: appAddress,
      sender: user.addr,
      note: 'Add funds',
    });
    await appClient.addFunds({ payTxn, quantity: fundAmount }, { sender: user });
    const globalState = await appClient.getGlobalState();
    expect(globalState.currentBalance!.asBigInt()).toBe(fundAmount);
  });

  test('send 5 algo', async () => {
    const { algorand } = fixture;
    const { appAddress } = await appClient.appClient.getAppReference();

    const sendAmount = 5n * 10n ** 6n;
    const globalStateBefore = await appClient.getGlobalState();
    const currentBalance = globalStateBefore.currentBalance!.asBigInt();;

    await appClient.sendFunds({ quantity: sendAmount, sendToAddress: orchestrator.addr }, { sender: orchestrator });
    const globalStateAfter = await appClient.getGlobalState();
    expect(globalStateAfter.currentBalance!.asBigInt()).toBe(currentBalance - sendAmount);
  });

  test('Remove 3 algo', async () => {
    const removalAmount = 3n * 10n ** 6n;
    const globalStateBefore = await appClient.getGlobalState();
    const currentBalance = globalStateBefore.currentBalance!.asBigInt();;
    await appClient.removeFunds({ quantity: removalAmount }, { sender: user });
    const globalStateAfter = await appClient.getGlobalState();
    expect(globalStateAfter.currentBalance!.asBigInt()).toBe(currentBalance - removalAmount);
    expect(globalStateAfter.currentBalance!.asBigInt()).toBe(2n * 10n ** 6n);
  });

  test('Remove final algo', async () => {
    const removalAmount = 0n;
    await appClient.removeFunds({ quantity: removalAmount }, { sender: user });
    const globalStateAfter = await appClient.getGlobalState();
    expect(globalStateAfter.currentBalance!.asBigInt()).toBe(0n);
  });

  test('delete application', async () => {
    await appClient.delete.deleteApplication({ sender: user });
  });

});
