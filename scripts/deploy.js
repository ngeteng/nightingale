const hre = require("hardhat");
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

  // INI BAGIAN YANG DIPERBAIKI
  console.log(`✅ Kontrak RescueVault berhasil di-deploy ke alamat: ${await rescueVault.getAddress()}`);
  console.log("Simpan alamat ini baik-baik!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
