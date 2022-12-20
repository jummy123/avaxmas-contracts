module.exports = async function ({ ethers, deployments, getNamedAccounts }) {
  const {deploy, execute} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = await getChainId();

  if (chainId == 31337) {
    await deploy('TestToken', {
      contract: 'TestToken',
      from: deployer,
      log: true,
    });
  }
};
module.exports.tags = ["TestToken"];
