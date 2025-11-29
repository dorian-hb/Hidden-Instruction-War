import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:game-address", "Prints the EncryptedBuildingGame address").setAction(async function (_taskArguments, hre) {
  const { deployments } = hre;

  const game = await deployments.get("EncryptedBuildingGame");

  console.log("EncryptedBuildingGame address is " + game.address);
});

task("task:claim-gold", "Claim starter gold").setAction(async function (_taskArguments, hre) {
  const { ethers, deployments } = hre;
  const { address } = await deployments.get("EncryptedBuildingGame");
  const [deployer] = await ethers.getSigners();

  const game = await ethers.getContractAt("EncryptedBuildingGame", address);
  const tx = await game.connect(deployer).claimGold();
  console.log("Claiming gold...");
  const receipt = await tx.wait();
  console.log(`claimed with status=${receipt?.status}`);
});

task("task:build", "Construct a building id (1 base, 2 barracks, 3 farm)")
  .addParam("type", "Building type id: 1 base, 2 barracks, 3 farm")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const { address } = await deployments.get("EncryptedBuildingGame");
    const [deployer] = await ethers.getSigners();

    const buildingType = parseInt(taskArguments.type);
    if (![1, 2, 3].includes(buildingType)) {
      throw new Error("Building type must be 1, 2, or 3");
    }

    const game = await ethers.getContractAt("EncryptedBuildingGame", address);
    const tx = await game.connect(deployer).build(buildingType);
    console.log(`Building type ${buildingType}...`);
    const receipt = await tx.wait();
    console.log(`build tx status=${receipt?.status}`);
  });

task("task:decrypt-buildings", "Decrypt buildings for the deployer")
  .addOptionalParam("player", "Player address to inspect")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const { address } = await deployments.get("EncryptedBuildingGame");
    const [deployer] = await ethers.getSigners();
    const target = taskArguments.player ?? deployer.address;

    const game = await ethers.getContractAt("EncryptedBuildingGame", address);
    const encryptedBuildings = await game.getBuildings(target);
    console.log(`Encrypted building handles for ${target}:`, encryptedBuildings);

    if (encryptedBuildings.length === 0) {
      console.log("No buildings to decrypt");
      return;
    }

    const results = await Promise.all(
      encryptedBuildings.map((handle: string) =>
        fhevm.userDecryptEuint(FhevmType.euint32, handle, address, deployer),
      ),
    );

    console.log("Decrypted building ids:", results);
  });
