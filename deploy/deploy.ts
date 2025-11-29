import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  if (!deployer) {
    throw new Error("Deployer account is missing. Set PRIVATE_KEY before deploying.");
  }

  const deployedGame = await deploy("WarGame", {
    from: deployer,
    log: true,
  });

  console.log(`WarGame contract: `, deployedGame.address);
};
export default func;
func.id = "deploy_WarGame"; // id required to prevent reexecution
func.tags = ["WarGame"];
