"use strict"

var MciCoin = artifacts.require("./MciCoin.sol");
const theBN = require("bn.js")

/**
 * MciCoin contract tests 2
 */
contract('MciCoin2', function(accounts) {
  const BIG = (v) => new theBN.BN(v)

  const owner = accounts[0];
  const admin = accounts[1];
  const vault = accounts[2];
  const minter = accounts[0];

  const user1 = accounts[4];
  const user2 = accounts[5];
  const user3 = accounts[6];
  const user4 = accounts[7];
  const user5 = accounts[8];

  let coin, OneMciCoinInMinunit, NoOfTokens, NoOfTokensInMinunit;

  const bnBalanceOf = async addr => await coin.balanceOf(addr);
  const bnReserveOf = async addr => await coin.reserveOf(addr);
  const bnAllowanceOf = async (owner, spender) => await coin.allowance(owner, spender);

  const balanceOf = async addr => (await coin.balanceOf(addr)).toString();
  const reserveOf = async addr => (await coin.reserveOf(addr)).toString();
  const allowanceOf = async (owner, spender) => (await coin.allowance(owner,spender)).toString();


  before(async () => {
    coin = await MciCoin.deployed();
    NoOfTokensInMinunit = await coin.totalSupply();
    OneMciCoinInMinunit = await coin.getOneMciCoin();
    NoOfTokens = NoOfTokensInMinunit.div(OneMciCoinInMinunit)
  });

  const clearUser = async user => {
    await coin.setReserve(user, 0, {from: admin});
    await coin.transfer(vault, await bnBalanceOf(user), {from: user});
  };

  beforeEach(async () => {
    await clearUser(user1);
    await clearUser(user2);
    await clearUser(user3);
    await clearUser(user4);
    await clearUser(user5);
  });

  it("only admin can recall", async () => {
      assert.equal(await balanceOf(user1), "0");
      await coin.transfer(user1, OneMciCoinInMinunit, {from: vault});
      await coin.setReserve(user1, OneMciCoinInMinunit, {from: admin});
      assert.equal(await balanceOf(user1), OneMciCoinInMinunit.toString());
      assert.equal(await reserveOf(user1), OneMciCoinInMinunit.toString());

      try {
          await coin.recall(user1, OneMciCoinInMinunit, {from: user1});
          assert.fail();
      } catch (exception) {
          assert.isTrue(exception.message.includes("revert"));
      }

      try {
          await coin.recall(user1, OneMciCoinInMinunit, {from: owner});
          assert.fail();
      } catch (exception) {
          assert.isTrue(exception.message.includes("revert"));
      }

      try {
          await coin.recall(user1, OneMciCoinInMinunit, {from: vault});
          assert.fail();
      } catch (exception) {
          assert.isTrue(exception.message.includes("revert"));
      }

      try
      {
          await coin.recall(user1, OneMciCoinInMinunit, {from: admin});
          assert.equal(await balanceOf(user1), "0");
          assert.equal(await reserveOf(user1), "0");
      } catch (exception) { assert.fail() }
  });

  it("recall fails", async () => {
    assert.equal(await bnBalanceOf(user2), 0);
    coin.transfer(user2, OneMciCoinInMinunit, {from: vault});
    assert.equal(await balanceOf(user2), OneMciCoinInMinunit.toString());
    assert.equal(await reserveOf(user2), "0");

    try {
      // require(currentReserve >= _amount);
      await coin.recall(user2, OneMciCoinInMinunit, {from: admin});
      assert.fail();
    }
    catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }

    coin.setReserve(user2, OneMciCoinInMinunit.mul(BIG(3)), {from: admin});
    try {
      // require(currentBalance >= _amount);
      await coin.recall(user2, OneMciCoinInMinunit.mul(BIG(2)), {from: admin});
      assert.fail()
    }
    catch(exception) {
      assert.equal(await balanceOf(user2), OneMciCoinInMinunit.toString());
      assert.equal(await reserveOf(user2), OneMciCoinInMinunit.mul(BIG(3)));
      assert.isTrue(exception.message.includes("revert"));
    }
  });

  it("after recall all coin", async () => {
    assert.equal(await bnBalanceOf(user3), 0);
    coin.transfer(user3, OneMciCoinInMinunit, {from: vault});
    coin.setReserve(user3, OneMciCoinInMinunit, {from: admin});
    assert.equal(await balanceOf(user3), OneMciCoinInMinunit.toString());
    assert.equal(await reserveOf(user3), OneMciCoinInMinunit.toString());

    const vaultBal = await bnBalanceOf(vault);

    coin.recall(user3, OneMciCoinInMinunit, {from: admin});

    assert.equal(await balanceOf(user3), "0");
    assert.equal(await reserveOf(user3), "0");

    assert.equal(await balanceOf(vault), vaultBal.add(OneMciCoinInMinunit).toString());
  });

  it("after recall half", async () => {
    assert.equal(await balanceOf(user4), "0");
    coin.transfer(user4, OneMciCoinInMinunit, {from: vault});
    coin.setReserve(user4, OneMciCoinInMinunit, {from: admin});
    assert.equal(await balanceOf(user4), OneMciCoinInMinunit.toString());
    assert.equal(await reserveOf(user4), OneMciCoinInMinunit.toString());

    const vaultBal = await bnBalanceOf(vault);
    const halfMciInMinunit = OneMciCoinInMinunit.div(BIG(2));

    coin.recall(user4, halfMciInMinunit, {from: admin});

    assert.equal(await balanceOf(user4), halfMciInMinunit.toString());
    assert.equal(await reserveOf(user4), halfMciInMinunit.toString());

    assert.equal(await balanceOf(vault), vaultBal.add(halfMciInMinunit).toString());
  });

  it("reserve and then approve", async() => {
    assert.equal(await balanceOf(user4), "0");

    const OneMciTimesTwoInMinunit = OneMciCoinInMinunit.mul(BIG(2))
    const OneMciTimesTwoInMinunitStr = OneMciTimesTwoInMinunit.toString()

    const OneMciTimesOneInMinunit = OneMciCoinInMinunit.mul(BIG(1))
    const OneMciTimesOneInMinunitStr = OneMciTimesOneInMinunit.toString()

    // send 2 Mci to user4 and set 1 Mci reserve
    coin.transfer(user4, OneMciTimesTwoInMinunit, {from: vault});
    coin.setReserve(user4, OneMciCoinInMinunit, {from: admin});
    assert.equal(await balanceOf(user4), OneMciTimesTwoInMinunitStr);
    assert.equal(await reserveOf(user4), OneMciCoinInMinunit.toString());

    // approve 2 Mci to user5
    await coin.approve(user5, OneMciTimesTwoInMinunit, {from:user4});
    assert.equal(await allowanceOf(user4, user5), OneMciTimesTwoInMinunitStr);

    // transfer 2 Mci from user4 to user5 SHOULD NOT BE POSSIBLE
    try {
      await coin.transferFrom(user4, user5, OneMciTimesTwoInMinunit, {from: user5});
      assert.fail();
    } catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }

    // transfer 1 Mci from user4 to user5 SHOULD BE POSSIBLE
    await coin.transferFrom(user4, user5, OneMciTimesOneInMinunit, {from: user5});
    assert.equal(await balanceOf(user4), OneMciTimesOneInMinunitStr);
    assert.equal(await reserveOf(user4), OneMciTimesOneInMinunitStr); // reserve will not change
    assert.equal(await allowanceOf(user4, user5), OneMciTimesOneInMinunitStr); // allowance will be reduced
    assert.equal(await balanceOf(user5), OneMciTimesOneInMinunitStr);
    assert.equal(await reserveOf(user5), "0");

    // transfer .5 Mci from user4 to user5 SHOULD NOT BE POSSIBLE if balance <= reserve
    const halfMciInMinunit = OneMciCoinInMinunit.div(BIG(2));
    try {
      await coin.transferFrom(user4, user5, halfMciInMinunit, {from: user5});
      assert.fail();
    } catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }
  })

  it("only minter can call mint", async() => {
      const OneMciTimesTenInMinunit = OneMciCoinInMinunit.mul(BIG(10))
      const OneMciTimesTenInMinunitStr = OneMciTimesTenInMinunit.toString()

      assert.equal(await balanceOf(user4), "0");

      await coin.mint(user4, OneMciTimesTenInMinunit, {from: minter})

      const totalSupplyAfterMintStr = (await coin.totalSupply()).toString()
      assert.equal(totalSupplyAfterMintStr, OneMciTimesTenInMinunit.add(NoOfTokensInMinunit).toString())
      assert.equal(await balanceOf(user4), OneMciTimesTenInMinunitStr);

      try {
          await coin.mint(user4, OneMciTimesTenInMinunit, {from: user4})
          assert.fail();
      } catch(exception) {
          assert.equal(totalSupplyAfterMintStr, OneMciTimesTenInMinunit.add(NoOfTokensInMinunit).toString())
          assert.isTrue(exception.message.includes("revert"));
      }
  })

  it("cannot mint above the mint cap", async() => {
      const OneMciTimes100BilInMinunit = 
              OneMciCoinInMinunit.mul(BIG(100000000000))

      assert.equal(await balanceOf(user4), "0");


      try {
          await coin.mint(user4, OneMciTimes100BilInMinunit, {from: minter})
          assert.fail();
      } catch(exception) {
          assert.isTrue(exception.message.includes("revert"));
      }
  })
});
