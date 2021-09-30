
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    describe('Airline can be registered, but does not participate in contract until it submits funding of 10 ether', () => {
        it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

            // ARRANGE
            

            // ACT
            let reverted = false;
            try {
                let value = web3.utils.toWei("1", "ether");
                await config.flightSuretyApp.fund({from: config.firstAirline.account, value: value});
                await config.flightSuretyApp.registerAirline(config.secondAirline.account, config.secondAirline.name, {from: config.firstAirline.account});
            }
            catch (e) {
                reverted = true;                
            }
            let result = await config.flightSuretyData.isAirline.call(config.secondAirline.account);

            // ASSERT
            assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
            assert.equal(reverted, true, "Only airline that is funded may register a new airline");
        });

        it('(airline) can register an Airline using registerAirline() if it is funded', async () => {

            // ARRANGE
            let newAirline = accounts[10];

            // ACT
            try {
                let value = web3.utils.toWei("10", "ether");
                await config.flightSuretyApp.fund({from: config.firstAirline.account, value: value});
                await config.flightSuretyApp.registerAirline(config.secondAirline.account, config.secondAirline.name, {from: config.firstAirline.account});
            }
            catch(e) { 
                console.log(e.message);
            }
            let result = await config.flightSuretyData.isAirline.call(config.secondAirline.account); 

            // ASSERT
            assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");            
        });
    });

    it('First airline is registered when contract is deployed', async () => {
        // ACT
        let number = await config.flightSuretyData.getAirlinesNum.call();
        let result = await config.flightSuretyData.isAirline.call(config.firstAirline.account);

        // ASSERT
        assert.equal(number, 1, "Number of registered airlines should be 1");
        assert.equal(result, true, "First airline is not registered when contract is deployed");
    });

    describe('Only existing airline may register a new airline until there are at least four airlines registered', () => {
        it('Non-existing airline cannot register a new airline', async () => {            
            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let reverted = false;
            try {
                await config.flightSuretyApp.registerAirline(config.thirdAirline.account, config.thirdAirline.name, { from: config.tenthAirline.account });
            }
            catch (e) {
                reverted = true;
            }
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.thirdAirline.account);

            // ASSERT
            assert.equal(beforeAirlinesNum, 2, "Before number of registered airlines should be 1");
            assert.equal(afterAirlinesNum, 2, "After number of registered airlines should be 1");
            assert.equal(result, false, "New airline should not be registered");
            assert.equal(reverted, true, "Only existing airline may register a new airline");
        });

        it('Existing airline can register a new airline until there are at least four airlines registered', async () => {
            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            try {
                await config.flightSuretyApp.registerAirline(config.thirdAirline.account, config.thirdAirline.name, { from: config.firstAirline.account });
                await config.flightSuretyApp.registerAirline(config.fourthAirline.account, config.fourthAirline.name, { from: config.firstAirline.account });                
            }
            catch (e) { }
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result3 = await config.flightSuretyData.isAirline.call(config.thirdAirline.account);
            let result4 = await config.flightSuretyData.isAirline.call(config.fourthAirline.account);

            // ASSERT
            assert.equal(beforeAirlinesNum, 2, "Before number of registered airlines should be 1");
            assert.equal(afterAirlinesNum, 4, "After number of registered airlines should be 4");
            assert.equal(result3, true, "Third airline is not registered");
            assert.equal(result4, true, "Fourth airline is not registered");
        });
    });

    describe('Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', () => {
        it('Multi-party consensus of less than 50% of registered airlines cannot register a new airline', async () => {
            // ACT
            try {
                await config.flightSuretyApp.registerAirline(config.fifthAirline.account, config.fifthAirline.name, { from: config.firstAirline.account });
                await config.flightSuretyApp.registerAirline(config.fifthAirline.account, config.fifthAirline.name, { from: config.firstAirline.account });
            }
            catch (e) {
                console.log(e);
            }
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.fifthAirline.account);
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();

            // ASSERT
            assert.equal(beforeAirlinesNum, 4, "Before number of registered airlines should be 4");
            assert.equal(afterAirlinesNum, 4, "After number of registered airlines should be 4");
            assert.equal(result, false, "Fifth airline should not be registered");
        });

        it('Multi-party consensus of more than 50% of registered airlines can register a new airline', async () => {
            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            try {
                let value = web3.utils.toWei("10", "ether");
                await config.flightSuretyApp.fund({from: config.secondAirline.account, value: value});
                await config.flightSuretyApp.registerAirline(config.fifthAirline.account, config.fifthAirline.name, { from: config.secondAirline.account });
            }
            catch (e) {
                console.log(e);
            }
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.fifthAirline.account);

            // ASSERT
            assert.equal(beforeAirlinesNum, 4, "Before number of registered airlines should be 4");
            assert.equal(afterAirlinesNum, 5, "After number of registered airlines should be 5");
            assert.equal(result, true, "Fifth airline should be registered");
        });
    });
});