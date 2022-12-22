import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

describe("SecretSanta", function () {
  before(async function () {
    this.signers = await ethers.getSigners();
  });

  beforeEach(async function () {
    await deployments.fixture(["SecretSanta", "TestToken", "MockVRFCoordinator"]);
    this.secretSanta = await ethers.getContract("SecretSanta");
    this.vrf = await ethers.getContract("MockVRFCoordinator");
    this.token = await ethers.getContract("TestToken");
    this.tokenOne = 0;
    const tx = await this.token.mint(this.signers[1].address);
    const receipt = await tx.wait();
    this.tokenOne = BigNumber.from(ethers.utils.hexValue(receipt.logs[0]['topics'][3]));  // From transfer event.
  });

  it("should set deployer as owner", async function () {
    expect(await this.secretSanta.owner()).to.eq(this.signers[0].address);
  });

  it("should fail if token not approved", async function () {
    await expect(
      this.secretSanta
        .connect(this.signers[1])
        .deposit(this.token.address, this.tokenOne, "Happy New Year")
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
          .deposit(this.token.address, this.tokenOne, "For You")
      )
        .to.be.reverted
    });

    describe("whitelisted connection", function () {

      beforeEach(async function () {
        await expect(
          this.secretSanta
          .connect(this.signers[0])
          .allowListCollection(this.token.address)
        )
          .to.emit(this.secretSanta, 'CollectionAdded')
          .withArgs(this.token.address);
      });

      it("should allow whitelisting multiple connections", async function () {
        const factory = await ethers.getContractFactory('ERC721PresetMinterPauserAutoId')
        const token2 = await factory.deploy('2', '2', '2');
        const token3 = await factory.deploy('3', '3', '3');
        await expect(
          this.secretSanta
          .connect(this.signers[0])
          .allowListCollections([token2.address, token3.address])
        )
          .to.emit(this.secretSanta, 'CollectionAdded')
          .withArgs(token2.address)
          .to.emit(this.secretSanta, 'CollectionAdded')
          .withArgs(token3.address);

      });

      it("should emit message on deposit", async function () {

        expect(await this.secretSanta.totalEntries()).to.equal(0);
        expect(await this.secretSanta.participated(this.signers[1].address)).to.equal(false);
        await expect(
          this.secretSanta
            .connect(this.signers[1])
            .deposit(this.token.address, this.tokenOne, "NGMI")
        )
          .to.emit(this.secretSanta, "Deposited")
          .withArgs(
            this.signers[1].address,
            this.token.address,
            this.tokenOne,
            "NGMI");
        expect(await this.secretSanta.senderDetails(this.signers[1].address))
          .to.eql([this.token.address, this.tokenOne, 'NGMI']);
        expect(await this.secretSanta.totalEntries()).to.equal(1);
        expect(await this.secretSanta.participated(this.signers[1].address)).to.equal(true);
      });

      describe("token deposited", async function () {

        beforeEach(async function () {
          await this.secretSanta
            .connect(this.signers[1])
            .deposit(this.token.address, this.tokenOne, "WAGMI");
        });

        it("should revert receiver details before ended", async function () {
          await expect(this.secretSanta.receiverDetails(this.signers[1].address))
            .to.be.reverted;

        });

        it("should revert if ended before time", async function (){
          await expect(this.secretSanta.end())
            .to.be.reverted;
        });

        describe("After end time", async function () {
          beforeEach(async function () {
            const tx = await this.token.mint(this.signers[2].address);
            const receipt = await tx.wait();
            this.newToken = BigNumber.from(ethers.utils.hexValue(receipt.logs[0]['topics'][3]));
            await this.token.connect(this.signers[2]).approve(this.secretSanta.address, this.newToken);
            await this.secretSanta.connect(this.signers[2]).deposit(this.token.address, this.newToken, "AVAX");
            await time.setNextBlockTimestamp(1672531201);
            await mine();

            await expect(this.secretSanta.end())
              .to.emit(this.secretSanta, "Ended")
              .withArgs(this.signers[0].address);
            await this.vrf.fulfill()
          });

          it("should revert if ended twice", async function (){
            await expect(this.secretSanta.end())
              .to.be.reverted;
          });

          it("should allocate gift after ending", async function () {

            expect(await this.secretSanta.totalEntries()).to.equal(2);
            expect(
              await this.secretSanta.receiverDetails(this.signers[1].address)
            )
              .to.eql([
                this.signers[2].address,
                this.token.address,
                this.newToken,
                'AVAX'])

            await expect(
              await this.secretSanta.receiverDetails(this.signers[2].address)
            )
              .to.eql([
                this.signers[1].address,
                this.token.address,
                this.tokenOne,
                'WAGMI'])
          });

          it("should send gift when claiming", async function () {
            await expect(
              this.secretSanta.connect(this.signers[1]).claim()
            )
              .to.emit(this.secretSanta, "Received")
              .withArgs(this.signers[1].address, this.token.address, this.newToken);
            expect(await this.token.ownerOf(this.newToken))
              .to.equal(this.signers[1].address);

            await expect(
              this.secretSanta.connect(this.signers[2]).claim()
            )
              .to.emit(this.secretSanta, "Received")
              .withArgs(this.signers[2].address, this.token.address, this.tokenOne);
            expect(await this.token.ownerOf(this.tokenOne))
              .to.equal(this.signers[2].address);

          });

          it("should paginate entries", async function () {
            const entries0 = await this.secretSanta.getLatestEntries(2);
            expect(entries0.length).to.equal(2);

            const entries1 = await this.secretSanta.getLatestEntries(1);
            expect(entries1.length).to.equal(1);

            const entries2 = await this.secretSanta.getLatestEntries(10);
            expect(entries2.length).to.equal(2);
          });

          it("should not allow deposit after ended", async function () {

            const tx = await this.token.mint(this.signers[9].address);
            const receipt = await tx.wait();
            const newToken = BigNumber.from(ethers.utils.hexValue(receipt.logs[0]['topics'][3]));  // From transfer event.
            await this.token.connect(this.signers[9]).approve(this.secretSanta.address, newToken);
            await expect(
               this.secretSanta
                 .connect(this.signers[9])
                 .deposit(this.token.address, newToken, 'YES')
             )
               .to.be.reverted
          });
        });

      });

    });

  });

});
