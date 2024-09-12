import { Contract } from '@algorandfoundation/tealscript';

export class DCA extends Contract {
  programVersion = 9;

  mbr = GlobalStateKey<uint64>();

  swappedTokenBalance = GlobalStateKey<uint64>();

  lastUpdated = GlobalStateKey<uint64>();

  orchestratorAddress = GlobalStateKey<Address>();

  swapManagerAccount = GlobalStateKey<Address>();

  userAddress = GlobalStateKey<Address>();

  SwapToTokenId = GlobalStateKey<uint64>();

  swapAmount = GlobalStateKey<uint64>();

  createApplication(orchestratorAddress: Address, swapToken: uint64, swapManagerAccount: Address): void {
    this.swappedTokenBalance.value = 0;
    this.mbr.value = 0;
    this.lastUpdated.value = globals.latestTimestamp;
    this.orchestratorAddress.value = orchestratorAddress;
    this.userAddress.value = this.txn.sender;
    this.SwapToTokenId.value = swapToken;
    this.swapAmount.value = 0;
    this.swapManagerAccount.value = swapManagerAccount;
  }


  deleteApplication(): void {
    assert(this.txn.sender === this.userAddress.value, "Only user can delete application");
  }

  optInToAsset(asset: AssetID): void {
    assert(this.txn.sender === this.userAddress.value, "Only user can opt contract into asset");

    sendAssetTransfer({
      xferAsset: asset,
      assetAmount: 0,
      assetReceiver: this.app.address,
      sender: this.app.address,
    });
  }

  addMBR(payTxn: PayTxn, quantity: uint64): void {
    assert(this.txn.sender == this.userAddress.value, "Only user can add MBR");

    verifyPayTxn(payTxn, {
      sender: this.userAddress.value,
      receiver: this.app.address,
      amount: quantity,
    });
    this.mbr.value += payTxn.amount;
    this.lastUpdated.value = globals.latestTimestamp;
  }

  setSwapParams(swapAmount: uint64, SwapToTokenId: uint64): void {
    assert(this.txn.sender == this.userAddress.value, "Only user can set swap params");

    this.swapAmount.value = swapAmount;
    this.SwapToTokenId.value = SwapToTokenId;

    this.lastUpdated.value = globals.latestTimestamp;
  }

  updateSwapManagerAccount(swapManagerAccount: Address): void {
    assert(this.txn.sender == this.orchestratorAddress.value, "Only orchestrator can update swap manager account");

    this.swapManagerAccount.value = swapManagerAccount;

    this.lastUpdated.value = globals.latestTimestamp;
  }

  initiateSwap(): void {
    assert(this.txn.sender == this.userAddress.value, "Only user can initiate swap");
    assert(this.app.address.balance > 0, "Insufficient balance");
    assert(this.swapAmount.value > 0, "Swap amount not set");
    assert(this.SwapToTokenId.value > 0, "Swap token not set");
    assert(this.mbr.value > 0, "Insufficient MBR");

    sendPayment({
      amount: this.swapAmount.value,
      sender: this.app.address,
      receiver: this.swapManagerAccount.value,
      note: "Swap requested: to, amount: " + this.SwapToTokenId.value + ", " + this.swapAmount.value,
    });

    this.lastUpdated.value = globals.latestTimestamp;
  }

  receiveSwap(axferTxn: AssetTransferTxn, quantity: uint64): void {
    assert(this.txn.sender == this.swapManagerAccount.value, "Only swap manager can send swap tokens");

    verifyAssetTransferTxn(axferTxn, {
      sender: this.swapManagerAccount.value,
      assetReceiver: this.app.address,
      assetAmount: quantity,
      xferAsset: AssetID.fromUint64(this.SwapToTokenId.value),
      note: axferTxn.xferAsset.id.toString() + ", " + axferTxn.assetAmount.toString(),
    });

    this.swappedTokenBalance.value += axferTxn.assetAmount;
    this.lastUpdated.value = globals.latestTimestamp;
  }

  sendSwappedTokens(sendToAddress: Address): void {
    assert(this.txn.sender == this.orchestratorAddress.value, "Only orchestrator can send swapped tokens to nominated accounts");
    assert(this.swappedTokenBalance.value > 0, "Insufficient swapped tokens");
    assert(this.mbr.value > 0, "Insufficient MBR");

    sendAssetTransfer({
      sender: this.app.address,
      assetReceiver: sendToAddress,
      assetAmount: this.swappedTokenBalance.value,
      xferAsset: AssetID.fromUint64(this.SwapToTokenId.value),
      note: "Swapped tokens sent to " + sendToAddress,
    })

    this.swappedTokenBalance.value = 0;
    this.lastUpdated.value = globals.latestTimestamp;
  }

}

