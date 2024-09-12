import { Contract } from '@algorandfoundation/tealscript';

export class Fund extends Contract {
    programVersion = 9;

    currentBalance = GlobalStateKey<uint64>();

    lastUpdated = GlobalStateKey<uint64>();

    orchestratorAddress = GlobalStateKey<Address>();

    userAddress = GlobalStateKey<Address>();

    mbr = GlobalStateKey<uint64>();

    //
    //Create application
    //
    createApplication(orchestratorAddress: Address): void {
        this.userAddress.value = this.txn.sender;
        this.orchestratorAddress.value = orchestratorAddress;
        this.currentBalance.value = 0;
        this.lastUpdated.value = globals.latestTimestamp;
    }

    deleteApplication(): void {
        assert(this.txn.sender === this.userAddress.value, "Only user can delete application");
    }

    addMBR(payTxn: PayTxn, quantity: uint64): void {
        assert(this.txn.sender == this.userAddress.value, "Only user can add MBR");

        verifyPayTxn(payTxn, {
            sender: this.userAddress.value,
            receiver: this.app.address,
            amount: quantity,
        });
        this.currentBalance.value += payTxn.amount;
        this.mbr.value += payTxn.amount
        this.lastUpdated.value = globals.latestTimestamp;
    }

    // Add algo funds to the contract
    addFunds(payTxn: PayTxn, quantity: uint64): void {
        assert(this.txn.sender == this.userAddress.value, "Only user can fund");
        assert(payTxn.amount > 0, "Amount must be greater than 0");
        assert(quantity > 0, "Quantity must be greater than 0");

        verifyPayTxn(payTxn, {
            sender: this.userAddress.value,
            receiver: this.app.address,
            amount: quantity,
        });
        this.currentBalance.value += payTxn.amount;
        this.lastUpdated.value = globals.latestTimestamp;
    }

    // Remove funds from the contract
    removeFunds(quantity: uint64): void {
        assert(this.txn.sender == this.userAddress.value, "Only user can remove funds");
        assert(this.currentBalance.value >= quantity, "Insufficient funds");
        
        let amount = quantity;
        if (amount === 0) {
            amount = this.currentBalance.value - this.mbr.value;
        }
        sendPayment(
            {
                amount: amount,
                receiver: this.userAddress.value,
                fee: 1000,
            }
        )
        this.currentBalance.value -= amount;
        this.lastUpdated.value = globals.latestTimestamp;
    }

    // Send funds to nominated address
    sendFunds(quantity: uint64, sendToAddress: Address): void {
        assert(this.txn.sender == this.orchestratorAddress.value, "Only orchestrator can send funds to nominated accounts");
        assert(this.currentBalance.value >= quantity, "Insufficient funds");

        let amount = quantity;
        if (amount === 0) {
            amount = this.currentBalance.value - this.mbr.value;
        }
        sendPayment(
            {
                amount: amount,
                receiver: sendToAddress,
                fee: 1000,
                note: "Funding request from " + this.app.id.toString() + " to " + sendToAddress
            }
        )
        this.currentBalance.value -= amount;
        this.lastUpdated.value = globals.latestTimestamp;
    }

}