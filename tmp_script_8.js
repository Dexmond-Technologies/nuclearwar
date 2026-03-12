function requestWorldBankLoan(collateral) {
    if (!window.myWalletAddress && !window.userWallet) {
        alert("Wallet not connected.");
        return;
    }
    if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'request_loan', wallet: window.myWalletAddress || window.userWallet, collateral: collateral }));
    }
}

function repayWorldBankLoan(repayment) {
    if (!window.myWalletAddress && !window.userWallet) {
        alert("Wallet not connected.");
        return;
    }
    if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'repay_loan', wallet: window.myWalletAddress || window.userWallet, repayment: repayment }));
    }
}

function updateWorldBankModal() {
    // Determine active loan UI
    const statusDiv = document.getElementById('wb-loan-status');
    const actionsDiv = document.getElementById('wb-loan-actions');
    
    if (window.activeLoan) {
        statusDiv.innerHTML = `<div style="color:#0f8; font-family:'Courier New', monospace; font-size:1.2vw; background:rgba(0,255,136,0.1); padding:20px; border:1px solid #0f8; border-radius:4px;">
            <div style="font-weight:bold; margin-bottom:10px; font-size:1.5vw;">✓ ACTIVE LOAN</div>
            COLLATERAL LOCKED: <span style="color:#fff;">${window.activeLoan.collateral} D3X</span><br/><br/>
            BORROWED CAPITAL: <span style="color:#fff;">${window.activeLoan.borrowed} D3X</span><br/><br/>
            <span style="color:#fc0;">Total Due: <strong>${window.activeLoan.borrowed} D3X</strong></span>
        </div>`;
        
        actionsDiv.innerHTML = `<button onclick="repayWorldBankLoan(${window.activeLoan.borrowed})" style="background:rgba(255,100,0,0.1); border:2px solid #fc0; color:#fc0; padding:20px; font-size:1.2vw; font-weight:bold; cursor:pointer; width:100%; transition:0.3s; box-shadow:0 0 15px rgba(255,200,0,0.2);">REPAY LOAN IN FULL (${window.activeLoan.borrowed} D3X)</button>`;
    } else {
        const btnStyle = "background:rgba(0,200,255,0.05); border:1px solid #0af; color:#0af; padding:15px 25px; margin-bottom:10px; font-size:1.2vw; display:flex; justify-content:space-between; cursor:pointer; transition:0.3s; box-shadow:0 0 10px rgba(0,170,255,0.1); width:100%;";
        statusDiv.innerHTML = `
            <div style="text-align:center; color:#aaa; font-size:1vw; margin-bottom:15px;">
                No interest, no time limits. Max 1 active loan.<br/>
                LTV Ratio: <span style="color:#fff; font-weight:bold;">50% - 60%</span>
            </div>
            <div style="color:#aaa; font-style:italic; font-size:1.2vw;">No active loans. You may borrow against existing D3X.</div>
        `;
        actionsDiv.innerHTML = `
            <button onclick="requestWorldBankLoan(5000)" style="${btnStyle}"><span>LOCK: 5,000 D3X</span> <strong style="color:#fff;">BORROW: 2,500 D3X</strong></button>
            <button onclick="requestWorldBankLoan(10000)" style="${btnStyle}"><span>LOCK: 10,000 D3X</span> <strong style="color:#fff;">BORROW: 5,200 D3X</strong></button>
            <button onclick="requestWorldBankLoan(20000)" style="${btnStyle}"><span>LOCK: 20,000 D3X</span> <strong style="color:#fff;">BORROW: 10,800 D3X</strong></button>
            <button onclick="requestWorldBankLoan(50000)" style="${btnStyle}"><span>LOCK: 50,000 D3X</span> <strong style="color:#fff;">BORROW: 28,000 D3X</strong></button>
            <button onclick="requestWorldBankLoan(100000)" style="${btnStyle}"><span>LOCK: 100,000 D3X</span> <strong style="color:#fff;">BORROW: 58,000 D3X</strong></button>
            <button onclick="requestWorldBankLoan(200000)" style="${btnStyle}"><span>LOCK: 200,000 D3X</span> <strong style="color:#fff;">BORROW: 118,000 D3X</strong></button>
            <button onclick="requestWorldBankLoan(500000)" style="${btnStyle}"><span>LOCK: 500,000 D3X</span> <strong style="color:#fff;">BORROW: 300,000 D3X</strong></button>
        `;
    }
}