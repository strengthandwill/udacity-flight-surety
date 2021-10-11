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


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, async (error, event) => {    
    const accounts = await web3.eth.getAccounts();    
    for (let a = 21; a <= ORACLES_COUNT + 20; a++) {
      // Get oracle information          
      let oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[a] });      
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          let statusCode = STATUS_CODE_LATE_AIRLINE;
          // let statusCode = parseInt(Math.random() * 6) * 10;
          await flightSuretyApp.methods.submitOracleResponse(
            oracleIndexes[idx], 
            event.returnValues.airline, 
            event.returnValues.flight, 
            event.returnValues.timestamp, 
            statusCode
          ).send ({ from: accounts[a] });
        }        
        catch (e) {
          // Enable this when debugging
          // console.log('\nError', idx, oracleIndexes[idx], event.returnValues.airline, event.returnValues.flight, event.returnValues.timestamp);
        }
      }
    }
});

// flightSuretyApp.getPastEvents('OracleRegistered', {fromBlock: 0, toBLock: 'latest'}, (error, events) => {
//   for (let event of events) {
//     console.log(event);
//   }
// });

(async function() {    
  const accounts = await web3.eth.getAccounts();
  for (let a = 21; a <= ORACLES_COUNT + 20; a++) {
    let result
    try {      
      // console.log(accounts[a]);    
      await flightSuretyApp.methods.registerOracle().send({ from: accounts[a], value: ONE_ETHER, gas: 6000000 });                
    } catch (e) {
      // console.log(e);
     }                    
  }
})();

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;