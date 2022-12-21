import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber } from "ethers";

describe("SecretSanta", function () {
  before(async function () {
    this.signers = await ethers.getSigners();
  });

  beforeEach(async function () {
    await deployments.fixture(["SecretSanta", "TestToken", "MockVRFCoordinator"]);
    this.secretSanta = await ethers.getContract("SecretSanta");
    this.token = await ethers.getContract("TestToken");
    this.tokenOne = (await this.token.mint(this.signers[1].address)).value;
  });

  it("should set deployer as owner", async function () {
    expect(await this.secretSanta.owner()).to.eq(this.signers[0].address);
  });

  it("should fail if token not approved", async function () {
    await expect(
      this.secretSanta
        .connect(this.signers[1])
        .deposit(this.token.address, this.tokenOne)
    ).to.be.reverted;
  });

  describe("gifting tokens", function () {
    beforeEach(async function () {
      await this.token
        .connect(this.signers[1])
        .approve(this.secretSanta.address, this.tokenOne);
    });

    it("should fail if token not in allow list", async function () {
  	  await expect(
        this.secretSanta
          .connect(this.signers[1])
          .deposit(this.token.address, this.tokenOne)
      )
        .to.be.reverted
    });

    describe("whitelisted connection", function () {

      beforeEach(async function () {
        await this.secretSanta
          .connect(this.signers[0])
          .allowListCollection(this.token.address);
      });

      it("should emit message on deposit", async function () {
        await this.secretSanta.connect
    	  await expect(
          this.secretSanta
            .connect(this.signers[1])
            .deposit(this.token.address, this.tokenOne)
        )
          .to.emit(this.secretSanta, "Deposited")
          .withArgs(this.signers[1].address, this.token.address, this.tokenOne);

        expect(await this.secretSanta.senderDetails(this.signers[1].address))
          .to.eql([this.token.address, this.tokenOne]);

      });


    });

  });

});
