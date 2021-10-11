import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import "@babel/polyfill";

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

const ORACLES_COUNT = 20;
const ONE_ETHER = web3.utils.toWei("1", "ether");
  
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let oracles = [];

(async function() {    
  const accounts = await web3.eth.getAccounts();
  for (let a = 21; a <= ORACLES_COUNT + 20; a++) {
    try {      
      await flightSuretyApp.methods.registerOracle().send({ from: accounts[a], value: ONE_ETHER, gas: 6000000 });
      let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[a] });                      
      oracles.push({
        oracle: accounts[a],
        indexes: indexes
      })
    } catch (e) {
      console.log(e);
     }                    
  }
})();

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, async (error, event) => {    

  for (let oracle of oracles) {   
  // for (let a = 21; a <= ORACLES_COUNT + 20; a++) {
    // Get oracle information   
    let indexes = oracle.indexes;
    // let oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[a] });      
    for (let idx = 0; idx < 3; idx++) {
      let airline = event.returnValues.airline;
      let flight = event.returnValues.flight;
      let timestamp = event.returnValues.timestamp;
      let statusCode = parseInt(Math.random() * 6) * 10;
      try {
        // Submit a response...it will only be accepted if there is an Index match
        // let statusCode = STATUS_CODE_LATE_AIRLINE;      
        await flightSuretyApp.methods.submitOracleResponse(
          indexes[idx], 
          airline, 
          flight, 
          timestamp, 
          statusCode
        ).send ({ from: oracle.oracle });
        console.log('\Success', idx, indexes[idx], airline, flight, timestamp, statusCode);
      }              
      catch (e) {
        // Enable this when debugging
        console.log('\nError', idx, indexes[idx], airline, flight, timestamp, e.message);
      }
    }
  }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;