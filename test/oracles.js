
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

const HALF_ETHER = web3.utils.toWei("0.5", "ether");
const ONE_ETHER = web3.utils.toWei("1", "ether");

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;

  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  var config;

  before('setup contract', async() => {
    config = await Test.Config(accounts);
  });


  describe('Can register oracles', async () => {
    it('Oracle cannot be registered if it submits less than the registration fee of 1 ether', async () => {      
      // ACT
      let result;
      let revert = false;      
      try {
        await config.flightSuretyApp.registerOracle({ from: accounts[21], value: HALF_ETHER });
        result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[21] });
      } catch (e) {
        revert = true;
      }
            
      // ASSERT
      assert.equal(result == null, true);
      assert.equal(revert, true, "Oracle need to submit registration fee");            
    });

    it('Oracle can be registered if it submits registration fee of 1 ether ', async () => {
      for (let a = 21; a <= TEST_ORACLES_COUNT + 20; a++) {
        // ACT
        let result
        try {
          await config.flightSuretyApp.registerOracle({ from: accounts[a], value: ONE_ETHER });          
          result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
        } catch (e) { }
                      
        // ASSERT
        assert.equal(result.length > 0, true);
        console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      }
    });
  });

  describe('Can request flight status', () => {
    it('Flight status cannot be updated if no or matching Oracles responded', async() => {

      // ARRANGE
      // Submit a request for oracles to get status information for a flight
      await config.flightSuretyApp.fetchFlightStatus(
        config.firstAirline.airline, 
        config.firstFlight.flight, 
        config.firstFlight.timestamp
      );

      // ACT
      let beforeFlightStatus = await config.flightSuretyApp.getFlightStatus(
        config.firstAirline.airline, 
        config.firstFlight.flight, 
        config.firstFlight.timestamp
      );      

      let afterFlightStatus = await config.flightSuretyApp.getFlightStatus(
        config.firstAirline.airline, 
        config.firstFlight.flight, 
        config.firstFlight.timestamp
      );

      assert.equal(beforeFlightStatus[0], STATUS_CODE_UNKNOWN, "Flight status should be STATUS_CODE_UNKNOWN");
      assert.equal(afterFlightStatus[0], STATUS_CODE_UNKNOWN, "Flight status should be STATUS_CODE_UNKNOWN");
    });

    it('Flight status can be updated if Oracles responded', async() => {

      // ARRANGE
      // Submit a request for oracles to get status information for a flight
      await config.flightSuretyApp.fetchFlightStatus(
        config.firstAirline.airline, 
        config.firstFlight.flight, 
        config.firstFlight.timestamp
      );

      // ACT
      let beforeFlightStatus = await config.flightSuretyApp.getFlightStatus(
        config.firstAirline.airline, 
        config.firstFlight.flight, 
        config.firstFlight.timestamp
      );

      // Since the Index assigned to each test account is opaque by design
      // loop through all the accounts and for each account, all its Indexes (indices?)
      // and submit a response. The contract will reject a submission if it was
      // not requested so while sub-optimal, it's a good test of that feature
      for (let a = 21; a <= TEST_ORACLES_COUNT + 20; a++) {

        // Get oracle information
        let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
        for (let idx = 0; idx < 3; idx++) {

          try {
            // Submit a response...it will only be accepted if there is an Index match
            await config.flightSuretyApp.submitOracleResponse(
              oracleIndexes[idx], 
              config.firstAirline.airline, 
              config.firstFlight.flight, 
              config.firstFlight.timestamp, 
              STATUS_CODE_ON_TIME, 
              { from: accounts[a] }
            );

          }
          catch (e) {
            // Enable this when debugging
            // console.log('\nError', idx, oracleIndexes[idx].toNumber(), config.firstFlight.flight, config.firstFlight.timestamp);
          }
        }
      }

      let afterFlightStatus = await config.flightSuretyApp.getFlightStatus(
        config.firstAirline.airline, 
        config.firstFlight.flight, 
        config.firstFlight.timestamp
      );

      assert.equal(beforeFlightStatus[0], STATUS_CODE_UNKNOWN, "Flight status should be STATUS_CODE_UNKNOWN");
      assert.equal(afterFlightStatus[0], STATUS_CODE_ON_TIME, "Flight status should be STATUS_CODE_ON_TIME");
    });
  });
});
