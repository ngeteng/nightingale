const hre = require("hardhat");
const fs = require("fs"); // 1. Import modul 'fs'
require("dotenv").config();

async function main() {
  const { COMPROMISED_WALLET_ADDRESS, SECURE_WALLET_ADDRESS } = process.env;

  if (!COMPROMISED_WALLET_ADDRESS || !SECURE_WALLET_ADDRESS) {
    throw new Error("Harap isi COMPROMISED_WALLET_ADDRESS dan SECURE_WALLET_ADDRESS di file .env");
  }

  console.log("Mendeploy kontrak RescueVault ke jaringan:", hre.network.name);
  console.log(`Owner (Korban): ${COMPROMISED_WALLET_ADDRESS}`);
  console.log(`Tujuan Aman: ${SECURE_WALLET_ADDRESS}`);
  
  const RescueVault = await hre.ethers.getContractFactory("RescueVault");
  const rescueVault = await RescueVault.deploy(
    COMPROMISED_WALLET_ADDRESS,
    SECURE_WALLET_ADDRESS
  );

  await rescueVault.waitForDeployment(); 

  const contractAddress = await rescueVault.getAddress();
  console.log(`✅ Kontrak RescueVault berhasil di-deploy ke alamat: ${contractAddress}`);

  // --- 2. BAGIAN PENTING YANG DITAMBAHKAN ---
  // Menyiapkan data untuk disimpan
  const contractInfo = {
    address: contractAddress,
    // Membaca ABI langsung dari artefak kompilasi Hardhat
    abi: hre.artifacts.readArtifactSync("RescueVault").abi
  };

  // Menulis data ke file 'contract-sepolia.json'
  fs.writeFileSync(
    "./contract-sepolia.json", 
    JSON.stringify(contractInfo, null, 2)
  );

  console.log("💾 Informasi kontrak telah disimpan ke 'contract-sepolia.json'");
  // --- SELESAI ---
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
