import { Contract } from '@algorandfoundation/tealscript';

export class DCA extends Contract {
  programVersion = 9;

  balanceTokenId = GlobalStateKey<uint64>();

  currentBalance = GlobalStateKey<uint64>();

  buyTokenId = GlobalStateKey<uint64>();

  buyTokenBalance = GlobalStateKey<uint64>();

  adminAddress = GlobalStateKey<Address>();

  buyTokenReceiver = GlobalStateKey<Address>();

  buyIntervalSeconds = GlobalStateKey<uint64>();

  targetSpend = GlobalStateKey<uint64>();

  targetBuy = GlobalStateKey<uint64>();

  startTime = GlobalStateKey<uint64>();

  endTime = GlobalStateKey<uint64>();

  lastUpdated = GlobalStateKey<uint64>();

  createApplication(
    adminAddress: Address,
    buyTokenReceiver: Address,
    balanceTokenId: uint64,
    buyTokenId: uint64,
    buyIntervalSeconds: uint64,
    targetSpend: uint64,
    targetBuy: uint64,
    endTime: uint64
  ): void {
    this.balanceTokenId.value = balanceTokenId;
    this.currentBalance.value = 0;
    this.buyTokenId.value = buyTokenId;
    this.adminAddress.value = adminAddress
    this.buyIntervalSeconds.value = buyIntervalSeconds;
    this.targetSpend.value = targetSpend;
    this.targetBuy.value = targetBuy
    this.startTime.value = globals.latestTimestamp;
    this.endTime.value = endTime
    this.lastUpdated.value = globals.latestTimestamp;
    this.buyTokenBalance.value = 0;
    this.buyTokenReceiver.value = buyTokenReceiver;
  }

  fundAlgo(payTxn: PayTxn, quantity: uint64): void {
    if (this.endTime.value > 0) {
      assert(globals.latestTimestamp < this.endTime.value, "End time has passed");
    }
    assert(this.txn.sender == this.adminAddress.value, "Only admin can fund");

    verifyPayTxn(payTxn, {
      sender: this.adminAddress.value,
      receiver: this.app.address,
      amount: quantity,
    });
    this.currentBalance.value += quantity;
    this.lastUpdated.value = globals.latestTimestamp;
  }

  updateParams(
    _buyIntervalSeconds: uint64,
    _targetSpend: uint64,
    _targetBuy: uint64,
    _endTime: uint64,
  ): void {
    assert(this.txn.sender == this.adminAddress.value, "Only admin can update params");

    this.buyIntervalSeconds.value = _buyIntervalSeconds
    this.targetSpend.value = _targetSpend
    this.targetBuy.value = _targetBuy
    this.endTime.value = _endTime

    this.lastUpdated.value = globals.latestTimestamp;
  }

  claimBuyTokens(): void {
    assert(this.txn.sender == this.adminAddress.value, "Only admin can claim buy token");

    if (this.buyTokenBalance.value > 0) {
      if (this.buyTokenId.value === 0) {
        sendPayment({
          amount: this.buyTokenBalance.value,
          sender: this.app.address,
          receiver: this.buyTokenReceiver.value,
          fee: 1000,
        })
      } else {
        sendAssetTransfer({
          assetAmount: this.buyTokenBalance.value,
          sender: this.app.address,
          assetReceiver: this.buyTokenReceiver.value,
          xferAsset: AssetID.fromUint64(this.buyTokenId.value),
          fee: 1000,
        });
      }
    }
    this.lastUpdated.value = globals.latestTimestamp;
  }

  removeFunds(quantity: uint64): void {
    assert(this.txn.sender == this.adminAddress.value, "Only admin can remove funds");
    const assetQuantity = quantity > 0 ? quantity : this.currentBalance.value;
    if (this.balanceTokenId.value === 0) {
      sendPayment({
        amount: assetQuantity,
        sender: this.app.address,
        receiver: this.adminAddress.value,
        fee: 1000,
      })
    } else {
      sendAssetTransfer({
        assetAmount: assetQuantity,
        sender: this.app.address,
        assetReceiver: this.adminAddress.value,
        xferAsset: AssetID.fromUint64(this.balanceTokenId.value),
        fee: 1000,
      });
    }

    this.currentBalance.value -= quantity;
    this.lastUpdated.value = globals.latestTimestamp;
  }
}

