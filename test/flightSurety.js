
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

const ONE_HALF_ETHER = web3.utils.toWei("1.5", "ether");
const ONE_ETHER = web3.utils.toWei("1", "ether");
const TEN_ETHER = web3.utils.toWei("10", "ether");
const ELEVEN_ETHER = web3.utils.toWei("11", "ether");

const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    describe('Utilty functions', () => {
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
    });

    describe('Registration of first airlines', () => {
        it('First airline is registered when contract is deployed', async () => {
            // ACT
            let number = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.firstAirline.airline);

            // ASSERT
            assert.equal(number, 1, "Number of registered airlines should be 1");
            assert.equal(result, true, "First airline is not registered when contract is deployed");
        });
    });

    describe('Funding of airlines', () => {
        it('(airline) cannot register an Airline using registerAirline() if it does not submit funding of 10 ether', async () => {            
            // ACT
            let reverted = false;
            try {                
                await config.flightSuretyApp.fund({from: config.firstAirline.airline, value: ONE_ETHER});
                await config.flightSuretyApp.registerAirline(config.secondAirline.airline, config.secondAirline.name, {from: config.firstAirline.airline});
            }
            catch (e) {
                reverted = true;                
            }
            let result = await config.flightSuretyData.isAirline.call(config.secondAirline.airline);

            // ASSERT
            assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
            assert.equal(reverted, true, "Only airline that is funded may register a new airline");
        });

        it('(airline) can register an Airline using registerAirline() if it submits funding of 10 ether', async () => {
            // ACT
            let beforeAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);            
            try {
                await config.flightSuretyApp.fund({from: config.firstAirline.airline, value: TEN_ETHER});
                await config.flightSuretyApp.registerAirline(config.secondAirline.airline, config.secondAirline.name, {from: config.firstAirline.airline});
            }
            catch(e) { 
                console.log(e.message);
            }
            let afterAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);
            let result = await config.flightSuretyData.isAirline.call(config.secondAirline.airline); 
            
            // ASSERT
            assert.equal(beforeAirlineFunds, 0);
            assert.equal(afterAirlineFunds, TEN_ETHER);
            assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");            
            
        });
    });

    describe('Registration of second to fourth airlines', () => {
        it('Non-existing airline cannot register a new airline', async () => {            
            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let reverted = false;
            try {
                await config.flightSuretyApp.registerAirline(config.thirdAirline.airline, config.thirdAirline.name, { from: config.tenthAirline.airline });
            }
            catch (e) {
                reverted = true;
            }
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.thirdAirline.airline);

            // ASSERT
            assert.equal(beforeAirlinesNum, 2, "Before number of registered airlines should be 1");
            assert.equal(afterAirlinesNum, 2, "After number of registered airlines should be 1");
            assert.equal(result, false, "New airline should not be registered");
            assert.equal(reverted, true, "Only existing airline may register a new airline");
        });

        it('Only existing airline can register a new airline until there are at least four airlines registered', async () => {
            // ACT
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            try {
                await config.flightSuretyApp.registerAirline(config.thirdAirline.airline, config.thirdAirline.name, { from: config.firstAirline.airline });
                await config.flightSuretyApp.registerAirline(config.fourthAirline.airline, config.fourthAirline.name, { from: config.firstAirline.airline });                
            }
            catch (e) { }
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result3 = await config.flightSuretyData.isAirline.call(config.thirdAirline.airline);
            let result4 = await config.flightSuretyData.isAirline.call(config.fourthAirline.airline);

            // ASSERT
            assert.equal(beforeAirlinesNum, 2, "Before number of registered airlines should be 1");
            assert.equal(afterAirlinesNum, 4, "After number of registered airlines should be 4");
            assert.equal(result3, true, "Third airline is not registered");
            assert.equal(result4, true, "Fourth airline is not registered");
        });
    });

    describe('Registration of fifth and subsequent airlines', () => {
        it('Multi-party consensus of less than 50% of registered airlines cannot register a new airline', async () => {
            // ACT
            try {
                await config.flightSuretyApp.registerAirline(config.fifthAirline.airline, config.fifthAirline.name, { from: config.firstAirline.airline });
                await config.flightSuretyApp.registerAirline(config.fifthAirline.airline, config.fifthAirline.name, { from: config.firstAirline.airline });
            }
            catch (e) {
                console.log(e);
            }
            let beforeAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.fifthAirline.airline);
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
                await config.flightSuretyApp.fund({from: config.secondAirline.airline, value: TEN_ETHER});
                await config.flightSuretyApp.registerAirline(config.fifthAirline.airline, config.fifthAirline.name, { from: config.secondAirline.airline });
            }
            catch (e) {
                console.log(e);
            }
            let afterAirlinesNum = await config.flightSuretyData.getAirlinesNum.call();
            let result = await config.flightSuretyData.isAirline.call(config.fifthAirline.airline);

            // ASSERT
            assert.equal(beforeAirlinesNum, 4, "Before number of registered airlines should be 4");
            assert.equal(afterAirlinesNum, 5, "After number of registered airlines should be 5");
            assert.equal(result, true, "Flight should be registered");
        });
    });

    describe('Registration of flights', () => {
        it('Not registered airline is not able to register new flights', async() => {
            // ACT
            let reverted = false;
            try {
                await config.flightSuretyApp.registerFlight(
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp, 
                    config.firstFlight.origin, 
                    config.firstFlight.destination,
                    { from: config.tenthAirline.airline });
            }
            catch (e) {  
                reverted = true;                
            }
            let result = await config.flightSuretyApp.isFlight.call(
                config.tenthAirline.airline,
                config.firstFlight.flight, 
                config.firstFlight.timestamp
            );

            // ASSERT
            assert.equal(result, false, "Flight not should be registered");
            assert.equal(reverted, true, "Only registered airline may register a new flight");
        });

        it('Registered airline is able to register new flights', async() => {
            // ACT
            try {
                await config.flightSuretyApp.registerFlight(
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp, 
                    config.firstFlight.origin, 
                    config.firstFlight.destination,
                    { from: config.firstAirline.airline });
            }
            catch (e) {
                console.log(e);
            }
            let result = await config.flightSuretyApp.isFlight.call(
                config.firstAirline.airline,
                config.firstFlight.flight, 
                config.firstFlight.timestamp
            );

            // ASSERT
            assert.equal(result, true, "Flight should be registered");
        });
    });

    describe('Passenger payment', () => {
        it('Passenger cannot pay more than 1 ether for purchasing flight insurance', async() => {
            // ACT
            let reverted = false;
            let beforeAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);            
            try {                
                await config.flightSuretyApp.buyInsurance(
                    config.firstPassenger.name,
                    config.firstAirline.airline,                    
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp,                     
                    { from: config.firstPassenger.passenger, value: TEN_ETHER });
            }
            catch (e) {
                reverted = true;
            }
            let result = await config.flightSuretyData.isInsuranceBought.call(
                config.firstPassenger.passenger,
                config.firstAirline.airline,
                config.firstFlight.flight, 
                config.firstFlight.timestamp
            );
            let afterAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);

            // ASSERT
            assert.equal(beforeAirlineFunds, TEN_ETHER);                        
            assert.equal(result, false, "Passenger should not have bought the flight insurance");
            assert.equal(afterAirlineFunds, TEN_ETHER);            
            assert.equal(reverted, true, "Passenger can only buy flight insurance less than or equal to 1 ether");
        });

        it('Passenger can pay up to 1 ether for purchasing flight insurance', async() => {
            // ACT
            let beforeAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);            
            try {                
                await config.flightSuretyApp.buyInsurance(
                    config.firstPassenger.name,
                    config.firstAirline.airline,                    
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp,                     
                    { from: config.firstPassenger.passenger, value: ONE_ETHER });
            }
            catch (e) {
                console.log(e.message);
            }
            let result = await config.flightSuretyData.isInsuranceBought.call(
                config.firstPassenger.passenger,
                config.firstAirline.airline,
                config.firstFlight.flight, 
                config.firstFlight.timestamp
            );
            let afterAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);

            // ASSERT
            assert.equal(beforeAirlineFunds, TEN_ETHER);                        
            assert.equal(result, true, "Passenger should have bought the flight insurance");
            assert.equal(afterAirlineFunds, Number(TEN_ETHER) + Number(ONE_ETHER));            
        });
    });

    describe('Passenger repayment', () => {
        it ('If flight is not delayed due to airline fault, passenger does not receive credit', async() => {
            // ACT
            const ONE_HALF_ETHER = web3.utils.toWei("1.5", "ether");
            const ELEVEN_ETHER = web3.utils.toWei("11", "ether");

            let reverted = false;
            let beforeInsureePayout = await config.flightSuretyData.getInsureePayout.call(config.firstPassenger.passenger);            
            let beforeAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);            
            try {                              
                await config.flightSuretyApp.updateFlightStatus(
                    config.firstAirline.airline,                    
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp,
                    STATUS_CODE_ON_TIME,
                    { from: config.firstAirline.airline });                                              
                await config.flightSuretyApp.payoutInsurance(
                    config.firstAirline.airline,                    
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp,                     
                    { from: config.firstAirline.airline });
            }
            catch (e) {
                reverted = true;
            }            
            let afterInsureePayout = await config.flightSuretyData.getInsureePayout.call(config.firstPassenger.passenger);
            let afterAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);

            // ASSERT
            assert.equal(beforeInsureePayout, 0);
            assert.equal(beforeAirlineFunds, ELEVEN_ETHER);
            assert.equal(afterInsureePayout, 0);            
            assert.equal(afterAirlineFunds, ELEVEN_ETHER);
            assert.equal(reverted, true, "Passenger can only recevie credit if flight us delayed due to airline fault");        
        });

        it ("If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid and\n\tInsurance payouts are not sent directly to passenger’s wallet", async() => {
            // ACT
            let beforeInsureePayout = await config.flightSuretyData.getInsureePayout.call(config.firstPassenger.passenger);            
            let beforeAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);            
            let beforeBalance = await await web3.eth.getBalance(config.firstPassenger.passenger);                        
            try {                              
                await config.flightSuretyApp.updateFlightStatus(
                    config.firstAirline.airline,                    
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp,
                    STATUS_CODE_LATE_AIRLINE,
                    { from: config.firstAirline.airline });                                              
                await config.flightSuretyApp.payoutInsurance(
                    config.firstAirline.airline,                    
                    config.firstFlight.flight, 
                    config.firstFlight.timestamp,                     
                    { from: config.firstAirline.airline });
            }
            catch (e) {
                console.log(e.message);
            }            
            let afterInsureePayout = await config.flightSuretyData.getInsureePayout.call(config.firstPassenger.passenger);
            let afterAirlineFunds = await config.flightSuretyData.getAirlineFunds.call(config.firstAirline.airline);
            let afterBalance = await await web3.eth.getBalance(config.firstPassenger.passenger);                        

            // ASSERT
            assert.equal(beforeInsureePayout, 0);
            assert.equal(beforeAirlineFunds, ELEVEN_ETHER);
            assert.equal(afterInsureePayout, ONE_HALF_ETHER);            
            assert.equal(afterAirlineFunds, Number(ELEVEN_ETHER) - Number(ONE_HALF_ETHER));
            
            /* Insurance payouts are not sent directly to passenger’s wallet */
            assert.equal(afterBalance, beforeBalance, "Insurance payouts should not be sent directly to passenger’s wallet");
        });                     
    });

    describe('Passenger withdraw', () => {  
        it('Passenger cannot withdraw funds if they have not bought the insurance', async() => {
            // ACT
            let reverted = false;
            let beforeBalance = await await web3.eth.getBalance(config.secondPassenger.passenger);  
            let isInsuree = await config.flightSuretyData.isInsuree(config.secondPassenger.passenger);
            try {                      
                await config.flightSuretyApp.withdrawPayout({ from: config.secondPassenger.passenger, gasPrice: 0 });                
            }
            catch (e) {
                reverted = true;
            }
            let afterBalance = await await web3.eth.getBalance(config.secondPassenger.passenger);            

            // ASSERT
            assert.equal(isInsuree, false, "Passenger should not have bought the insurance");                       
            assert.equal(afterBalance, beforeBalance);            
            assert.equal(reverted, true, "Passenger can only withdraw funds if the insurance is bought");
        });           
        
        it('Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout', async() => {
            // ACT            
            let beforeInsureePayout = await config.flightSuretyData.getInsureePayout.call(config.firstPassenger.passenger);
            let beforeBalance = await await web3.eth.getBalance(config.firstPassenger.passenger);            
            try {                      
                await config.flightSuretyApp.withdrawPayout({ from: config.firstPassenger.passenger, gasPrice: 0 });                
            }
            catch (e) {
                console.log(e.message);
            }
            let afterInsureePayout = await config.flightSuretyData.getInsureePayout.call(config.firstPassenger.passenger);
            let afterBalance = await await web3.eth.getBalance(config.firstPassenger.passenger);            

            // ASSERT
            assert.equal(beforeInsureePayout, ONE_HALF_ETHER);            
            assert.equal(afterInsureePayout, 0);            
            assert.equal(Number(afterBalance), Number(beforeBalance) + Number(ONE_HALF_ETHER));            
        });        
    });

    // describe('Insurance payouts', () => {
    //     it("Insurance payouts are not sent directly to passenger’s wallet", async() => {

    //     });  
    // });
});