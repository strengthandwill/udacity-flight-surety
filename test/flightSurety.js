
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
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

    it('First airline is registered when contract is deployed', async() => {  
        // ACT
        let number = await config.flightSuretyData.getAirlinesNum.call(); 
        let result = await config.flightSuretyData.isAirline.call(config.firstAirline); 

        // ASSERT
        assert.equal(number, 1, "Number of registered airlines should be 1");
        assert.equal(result, true, "First airline is not registered when contract is deployed");
    });

    describe('Only existing airline may register a new airline until there are at least four airlines registered', () => {  
        it ('Non-existing airline register a new airline', async() => {
            // ARRANGE
            let nonExisitingAirline = accounts[10];

            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            let reverted = false;
            try {            
                await config.flightSuretyApp.registerAirline(accounts[11], "New Airline", {from: nonExisitingAirline});                
            }
            catch(e) { 
                reverted = true;
            }     
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            let result = await config.flightSuretyData.isAirline.call(accounts[11]);            

            // ASSERT
            assert.equal(beforeAirlinesNum, 1, "Before number of registered airlines should be 1");
            assert.equal(afterAirlinesNum, 1, "After number of registered airlines should be 1");
            assert.equal(result, false, "New airline should not be registered");
            assert.equal(reverted, true, "Only existing airline may register a new airline");      
        }); 
        
        it ('Existing airline register a new airline', async() => {
            // ARRANGE
            let existingAirline = config.firstAirline;

            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            try {                       
                await config.flightSuretyApp.registerAirline(accounts[2], "Second Airline", {from: existingAirline});
                await config.flightSuretyApp.registerAirline(accounts[3], "Third Airline", {from: existingAirline});
                await config.flightSuretyApp.registerAirline(accounts[4], "Fourth Airline", {from: existingAirline});                
            }
            catch(e) { }     
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            let result2 = await config.flightSuretyData.isAirline.call(accounts[2]);
            let result3 = await config.flightSuretyData.isAirline.call(accounts[3]);    
            let result4 = await config.flightSuretyData.isAirline.call(accounts[4]);    

            // ASSERT
            assert.equal(beforeAirlinesNum, 1, "Before number of registered airlines should be 1");
            assert.equal(afterAirlinesNum, 4, "After number of registered airlines should be 4");
            assert.equal(result2, true, "Second airline is not registered");
            assert.equal(result3, true, "Third airline is not registered");
            assert.equal(result4, true, "Fourth airline is not registered");
        }); 
    });

    describe('Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', () => {
        it ('Multi-party consensus of less than 50% of registered airlines', async() => {
            // ACT
            try {                       
                await config.flightSuretyApp.registerAirline(accounts[5], "Fifth Airline", {from: accounts[1]});
                await config.flightSuretyApp.registerAirline(accounts[5], "Fifth Airline", {from: accounts[1]});                
            }
            catch(e) { 
                console.log(e);
            }     
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            let result = await config.flightSuretyData.isAirline.call(accounts[5]);            
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 

            // ASSERT
            assert.equal(beforeAirlinesNum, 4, "Before number of registered airlines should be 4");
            assert.equal(afterAirlinesNum, 4, "After number of registered airlines should be 4");
            assert.equal(result, false, "Fifth airline should not be registered");
        });

        it ('Multi-party consensus of more than 50% of registered airlines', async() => {            
            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            try {                       
                await config.flightSuretyApp.registerAirline(accounts[5], "Fifth Airline", {from: accounts[2]});                                
            }
            catch(e) { 
                console.log(e);
            }     
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call(); 
            let result = await config.flightSuretyData.isAirline.call(accounts[5]);            

            // ASSERT
            assert.equal(beforeAirlinesNum, 4, "Before number of registered airlines should be 4");
            assert.equal(afterAirlinesNum, 5, "After number of registered airlines should be 5");
            assert.equal(result, true, "Fifth airline should be registered");            
        });
    });
});