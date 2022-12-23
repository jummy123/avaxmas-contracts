require("@nomicfoundation/hardhat-toolbox");

const fs = require('fs');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

task("allowListCollections", "Allow lists collections from a JSON file'")
  .addParam("path", "The path to json file of collections!")
  .setAction(async ({ path }) => {
    const collections = JSON.parse(fs.readFileSync(path));
    const secretSanta = await ethers.getContract('SecretSanta');
    let collectionAddresses = [];
    collections.forEach(function(obj) {
        collectionAddresses.push(obj['address']);
    });
    for (let i=0; i < collectionAddresses.length; i+= 100) {
        await secretSanta.allowListCollections(collectionAddresses.slice(i, i+100));
        await sleep(2000);
        console.log('allow listed contracts', i, i+100);
    }
  });
