const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

// --- KONFIGURASI ---
const { SEPOLIA_RPC_URL, COMPROMISED_PRIVATE_KEY } = process.env;
const CHECK_INTERVAL_MS = 10000; // Cek setiap 10 detik

// Daftar token ERC20 yang ingin dipantau di Sepolia
// Contoh: WETH di Sepolia
const tokensToWatch = [
    { name: "Wrapped Ether", address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" }
    // Tambahkan token lain di sini jika perlu
];

// --- FUNGSI UTAMA ---
async function main() {
    console.log("🚀 Memulai bot pemantau RescueVault...");

    // 1. Inisialisasi Provider dan Wallet Korban
    if (!COMPROMISED_PRIVATE_KEY || !SEPOLIA_RPC_URL) {
        throw new Error("Harap pastikan SEPOLIA_RPC_URL dan COMPROMISED_PRIVATE_KEY sudah diatur di .env");
    }
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const compromisedWallet = new ethers.Wallet(COMPROMISED_PRIVATE_KEY, provider);
    console.log(`Menggunakan wallet korban: ${compromisedWallet.address}`);

    // 2. Muat informasi kontrak dari file
    const contractInfoPath = './contract-sepolia.json';
    if (!fs.existsSync(contractInfoPath)) {
        throw new Error(`File kontrak ${contractInfoPath} tidak ditemukan. Jalankan deploy.js terlebih dahulu.`);
    }
    const { address: rescueVaultAddress, abi: rescueVaultAbi } = JSON.parse(fs.readFileSync(contractInfoPath, 'utf-8'));
    console.log(`Memantau kontrak di alamat: ${rescueVaultAddress}`);

    // Buat instance kontrak yang terhubung dengan wallet korban (untuk mengirim transaksi)
    const rescueVaultContract = new ethers.Contract(rescueVaultAddress, rescueVaultAbi, compromisedWallet);

    // 3. Loop Pemantauan
    console.log(`Memulai pemantauan setiap ${CHECK_INTERVAL_MS / 1000} detik...`);
    setInterval(() => checkAndSweep(provider, rescueVaultContract), CHECK_INTERVAL_MS);
}

/**
 * Fungsi yang memeriksa saldo dan menjalankan sweep jika perlu.
 * @param {ethers.Provider} provider - Provider Ethers
 * @param {ethers.Contract} rescueVaultContract - Instance kontrak RescueVault
 */
async function checkAndSweep(provider, rescueVaultContract) {
    try {
        console.log(`\n[${new Date().toLocaleTimeString()}] Melakukan pengecekan...`);

        // A. Cek Saldo Native (ETH)
        const nativeBalance = await provider.getBalance(rescueVaultContract.getAddress());
        if (nativeBalance > 0) {
            console.log(`🔥 Terdeteksi Saldo NATIVE: ${ethers.formatEther(nativeBalance)} ETH. Memulai sweep...`);
            const tx = await rescueVaultContract.sweepNative();
            console.log(`Transaksi sweep native dikirim, hash: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Sweep native berhasil dikonfirmasi!`);
        } else {
            console.log("Saldo native: 0");
        }

        // B. Cek Saldo Token ERC20
        let tokensToSweep = [];
        for (const token of tokensToWatch) {
            const tokenContract = new ethers.Contract(token.address, ["function balanceOf(address) view returns (uint256)"], provider);
            const tokenBalance = await tokenContract.balanceOf(await rescueVaultContract.getAddress());
            
            if (tokenBalance > 0) {
                console.log(`🔥 Terdeteksi Saldo TOKEN: ${ethers.formatUnits(tokenBalance, 18)} ${token.name}.`);
                tokensToSweep.push(token.address);
            }
        }

        if (tokensToSweep.length > 0) {
            console.log(`Memulai sweep untuk ${tokensToSweep.length} token...`);
            const tx = await rescueVaultContract.sweepTokens(tokensToSweep);
            console.log(`Transaksi sweep token dikirim, hash: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Sweep token berhasil dikonfirmasi!`);
        } else {
            console.log("Saldo token: 0");
        }

    } catch (error) {
        console.error("❌ Terjadi error saat check/sweep:", error.message);
    }
}


main().catch(error => {
    console.error("❌ Terjadi error fatal di luar loop:", error);
    process.exit(1);
});
