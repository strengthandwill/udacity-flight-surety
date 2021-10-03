
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"
    ];

    let owner = accounts[0];
    let flightSuretyData = await FlightSuretyData.new(accounts[1], "First Airline");
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);
    flightSuretyData.authorizeCaller(flightSuretyApp.address);

    console.log(`    flightSuretyApp : ${flightSuretyApp.address}`);
    console.log(`    flightSuretyData: ${flightSuretyData.address}`);
    console.log(`    First Airline   : ${accounts[1]}`);
    console.log(`    Second Airline  : ${accounts[2]}`);
    console.log(`    Third Airline   : ${accounts[3]}`);
    console.log(`    Fourth Airline  : ${accounts[4]}`);
    console.log(`    Fifth Airline   : ${accounts[5]}`);
    console.log(`    Tenth Airline   : ${accounts[10]}`);
    console.log(`    First Passenger : ${accounts[11]}`);
    console.log(`    Second Passenger: ${accounts[12]}`);
    
    return {
        owner           : owner,
        weiMultiple     : (new BigNumber(10)).pow(18),
        testAddresses   : testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp : flightSuretyApp,
        firstAirline    : { airline: accounts[1], name: "First Airline"},
        secondAirline   : { airline: accounts[2], name: "Second Airline"},
        thirdAirline    : { airline: accounts[3], name: "Third Airline"},
        fourthAirline   : { airline: accounts[4], name: "Fouth Airline"},
        fifthAirline    : { airline: accounts[5], name: "Fifth Airline"},
        tenthAirline    : { airline: accounts[10], name: "Tenth Airline"},
        firstFlight     : { flight: "ND1309", timestamp: 12345678, origin: "Singapore", destination: "Hong Kong" },
        firstPassenger  : accounts[11],
        secondPassenger : accounts[12]
    }
}

module.exports = {
    Config: Config
};