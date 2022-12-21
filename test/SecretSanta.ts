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
    expect(
      this.secretSanta
        .connect(this.signers[1])
        .deposit(this.token.address, this.tokenOne)
    ).to.be.reverted;
  });

  it("should succeed if token approved", async function () {
    await this.token
      .connect(this.signers[1])
      .approve(this.secretSanta.address, this.tokenOne);
	expect(
      this.secretSanta
        .connect(this.signers[1])
        .deposit(this.token, this.tokenOne)
    )
      .to.emit(this.secretSanta, "Deposited")
      .withArgs(this.signers[1].address, this.token, this.tokenOne);
  });
});
