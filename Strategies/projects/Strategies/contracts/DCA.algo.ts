import { Contract } from '@algorandfoundation/tealscript';

const MBR = 2_000;

export class DCA extends Contract {
  programVersion = 9;

  balanceTokenId = GlobalStateKey<uint64>();

  currentBalance = GlobalStateKey<uint64>();

  buyTokenId = GlobalStateKey<uint64>();

  buyTokenBalance = GlobalStateKey<uint64>();

  adminAddress = GlobalStateKey<Address>();

  buyTokenReceiver = GlobalStateKey<Address>();

  buyIntervalSeconds = GlobalStateKey<uint64>();

  buyIntervalAmount = GlobalStateKey<uint64>();

  swapWalletAddress = GlobalStateKey<Address>();

  targetSpend = GlobalStateKey<uint64>();

  lastUpdated = GlobalStateKey<uint64>();

  buyingTokens = GlobalStateKey<boolean>();

  createApplication(
    adminAddress: Address,
    buyTokenReceiver: Address,
    balanceTokenId: uint64,
    buyTokenId: uint64,
    buyIntervalSeconds: uint64,
    targetSpend: uint64,
  ): void {
    this.balanceTokenId.value = balanceTokenId;
    this.currentBalance.value = 0;
    this.buyTokenId.value = buyTokenId;
    this.adminAddress.value = adminAddress
    this.buyIntervalSeconds.value = buyIntervalSeconds;
    this.buyIntervalAmount.value = 0;
    this.targetSpend.value = targetSpend;
    this.lastUpdated.value = globals.latestTimestamp;
    this.buyTokenBalance.value = 0;
    this.buyTokenReceiver.value = buyTokenReceiver;
    this.buyingTokens.value = false;

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

    this.lastUpdated.value = globals.latestTimestamp;
  }

  fundAlgo(payTxn: PayTxn, quantity: uint64): void {
    assert(this.txn.sender == this.adminAddress.value, "Only admin can fund");

    verifyPayTxn(payTxn, {
      sender: this.adminAddress.value,
      receiver: this.app.address,
      amount: quantity,
    });
    this.currentBalance.value += quantity;
    this.buyIntervalAmount.value = quantity / this.targetSpend.value;
    this.lastUpdated.value = globals.latestTimestamp;
  }

  fundAsset(assetTxn: AssetTransferTxn, quantity: uint64): void {
    assert(this.txn.sender == this.adminAddress.value, "Only admin can fund");

    verifyAssetTransferTxn(assetTxn, {
      sender: this.adminAddress.value,
      assetAmount: quantity,
      xferAsset: AssetID.fromUint64(this.balanceTokenId.value),
      assetReceiver: this.app.address,
    });
    this.currentBalance.value += quantity;
    this.buyIntervalAmount.value = quantity / this.targetSpend.value;
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
    this.buyIntervalAmount.value = quantity / this.targetSpend.value;
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
    this.buyTokenBalance.value = 0;
    this.lastUpdated.value = globals.latestTimestamp;
  }

  transferFundsForSwap(assetId: uint64): void {
    assert(this.txn.sender == this.swapWalletAddress.value, "Only swap wallet can transfer funds for swap");
    assert(this.balanceTokenId.value === assetId, "Invalid balance asset id");
    assert(this.currentBalance.value > 0, "No current balance");
    assert(this.targetSpend.value > 0, "Invalid target spend");
    let assetQuantity = this.buyIntervalAmount.value;

    if (this.currentBalance.value < this.buyIntervalAmount.value) {
      assetQuantity = this.currentBalance.value;
    }

    if (this.balanceTokenId.value === 0) {
      sendPayment({
        amount: assetQuantity,
        sender: this.app.address,
        receiver: this.swapWalletAddress.value,
        fee: 1000,
      });
    }
    if(this.balanceTokenId.value !== 0) {
      sendAssetTransfer({
        assetAmount: assetQuantity,
        sender: this.app.address,
        assetReceiver: this.swapWalletAddress.value,
        xferAsset: AssetID.fromUint64(this.balanceTokenId.value),
        fee: 1000,
      });
    }

    this.buyingTokens.value = true;
  }

  receiveBoughtTokensAlgo(payTxn: PayTxn, quantity: uint64): void {
    assert(this.txn.sender == this.swapWalletAddress.value, "Only swap wallet can send bought tokens");
    verifyPayTxn(payTxn, {
      sender: this.swapWalletAddress.value,
      receiver: this.app.address,
      amount: quantity,
    });
    this.buyingTokens.value = false;
    this.buyTokenBalance.value += quantity;
  }

  receiveBoughtTokensAsset(assetTxn: AssetTransferTxn, quantity: uint64): void {
    assert(this.txn.sender == this.swapWalletAddress.value, "Only swap wallet can send bought tokens");
    verifyAssetTransferTxn(assetTxn, {
      sender: this.swapWalletAddress.value,
      assetAmount: quantity,
      xferAsset: AssetID.fromUint64(this.buyTokenId.value),
      assetReceiver: this.app.address,
    });
    this.buyingTokens.value = false;
    this.buyTokenBalance.value += quantity;
  }

  deleteApplication(): void {
    assert(this.txn.sender == this.adminAddress.value, "Only admin can delete application");
    if (this.currentBalance.value > 0) {
      if (this.balanceTokenId.value === 0) {
        sendPayment({
          amount: this.currentBalance.value,
          sender: this.app.address,
          receiver: this.adminAddress.value,
          fee: 1000,
        });
      } else {
        sendAssetTransfer({
          assetAmount: this.currentBalance.value,
          sender: this.app.address,
          assetReceiver: this.adminAddress.value,
          xferAsset: AssetID.fromUint64(this.balanceTokenId.value),
          fee: 1000,
        });
      }
    }
    if (this.buyTokenBalance.value > 0) {
      if (this.buyTokenId.value === 0) {
        sendPayment({
          amount: this.buyTokenBalance.value,
          sender: this.app.address,
          receiver: this.adminAddress.value,
          fee: 1000,
        });
      } else {
        sendAssetTransfer({
          assetAmount: this.buyTokenBalance.value,
          sender: this.app.address,
          assetReceiver: this.adminAddress.value,
          xferAsset: AssetID.fromUint64(this.buyTokenId.value),
          fee: 1000,
        });
      }
    }
  }
}

