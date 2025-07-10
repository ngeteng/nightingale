// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interface standar untuk token ERC20
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @title RescueVault V2
 * @dev Kontrak brankas yang bisa menyelamatkan native coin dan token ERC20.
 */
contract RescueVault {
    address public immutable owner; // Alamat wallet korban
    address public immutable secureWallet; // Alamat wallet tujuan yang aman

    event SweptNative(uint amount);
    event SweptToken(address indexed token, uint amount);

    constructor(address _compromisedOwner, address _secureWallet) {
        require(_compromisedOwner != address(0), "Owner address cannot be zero");
        require(_secureWallet != address(0), "Secure wallet address cannot be zero");
        owner = _compromisedOwner;
        secureWallet = _secureWallet;
    }

    // Wajib ada agar kontrak bisa menerima ETH/BNB
    receive() external payable {}

    /**
     * @dev Menyelamatkan semua saldo native coin (ETH/BNB) dari kontrak ini.
     * Hanya bisa dipanggil oleh 'owner' (wallet korban).
     */
    function sweepNative() external {
        require(msg.sender == owner, "RescueVault: Caller is not the owner");
        uint balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(secureWallet).call{value: balance}("");
            require(success, "RescueVault: Native transfer failed");
            emit SweptNative(balance);
        }
    }

    /**
     * @dev Menyelamatkan saldo token ERC20 dari daftar alamat token yang diberikan.
     * Hanya bisa dipanggil oleh 'owner' (wallet korban).
     * @param tokenAddresses Array dari alamat kontrak token ERC20 yang akan diselamatkan.
     */
    function sweepTokens(address[] calldata tokenAddresses) external {
        require(msg.sender == owner, "RescueVault: Caller is not the owner");

        for (uint i = 0; i < tokenAddresses.length; i++) {
            IERC20 token = IERC20(tokenAddresses[i]);
            uint256 balance = token.balanceOf(address(this));

            if (balance > 0) {
                token.transfer(secureWallet, balance);
                emit SweptToken(address(token), balance);
            }
        }
    }
}
