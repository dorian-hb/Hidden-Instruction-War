import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedBuildingGame, EncryptedBuildingGame__factory } from "../types";

describe("EncryptedBuildingGame", function () {
  let deployer: HardhatEthersSigner;
  let player: HardhatEthersSigner;
  let game: EncryptedBuildingGame;
  let gameAddress: string;

  before(async function () {
    const [owner, user] = await ethers.getSigners();
    deployer = owner;
    player = user;
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("Local FHEVM mock required for this suite");
      this.skip();
    }

    const factory = (await ethers.getContractFactory(
      "EncryptedBuildingGame",
    )) as EncryptedBuildingGame__factory;
    game = (await factory.deploy()) as EncryptedBuildingGame;
    gameAddress = await game.getAddress();
  });

  it("starts with zero balances and no buildings", async function () {
    const balance = await game.getGoldBalance(player.address);
    const encrypted = await game.getEncryptedGold(player.address);
    const buildings = await game.getBuildings(player.address);

    expect(balance).to.equal(0);
    expect(encrypted).to.equal(ethers.ZeroHash);
    expect(buildings.length).to.equal(0);
    expect(await game.hasClaimedGold(player.address)).to.equal(false);
  });

  it("lets a player claim starter gold only once", async function () {
    await game.connect(player).claimGold();

    const balance = await game.getGoldBalance(player.address);
    expect(balance).to.equal(500);

    const encrypted = await game.getEncryptedGold(player.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint64, encrypted, gameAddress, player);
    expect(decrypted).to.equal(500);
    expect(await game.hasClaimedGold(player.address)).to.equal(true);

    await expect(game.connect(player).claimGold()).to.be.revertedWith("Gold already claimed");
  });

  it("spends gold to build and stores encrypted ids", async function () {
    await game.connect(player).claimGold();

    await game.connect(player).build(1);

    const balance = await game.getGoldBalance(player.address);
    expect(balance).to.equal(400);

    const encryptedGold = await game.getEncryptedGold(player.address);
    const decryptedGold = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedGold, gameAddress, player);
    expect(decryptedGold).to.equal(400);

    const buildings = await game.getBuildings(player.address);
    expect(buildings.length).to.equal(1);

    const decryptedBuilding = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      buildings[0],
      gameAddress,
      player,
    );
    expect(decryptedBuilding).to.equal(1);
  });

  it("rejects unknown buildings and insufficient gold", async function () {
    await expect(game.connect(player).build(4)).to.be.revertedWith("Unsupported building");
    await expect(game.connect(player).build(1)).to.be.revertedWith("Not enough gold");
  });
});
