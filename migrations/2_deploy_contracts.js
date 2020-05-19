var MciCoin = artifacts.require("./contracts/MciCoin.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(MciCoin, 'MCI', 'MCICoin', accounts[0], accounts[1], accounts[2]).then( () => {
    console.log(`MciCoin deployed: address = ${MciCoin.address}`);
  });
};
