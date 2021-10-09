import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        // this.owner = null;
        // this.airlines = [];
        // this.passengers = [];
        this.initialize(config, callback);
    }

    async initialize(config, callback) {
        /// Find or Inject Web3 Provider
        /// Modern dapp browsers...
        if (window.ethereum) {
            this.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access");
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            this.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            this.web3Provider = new Web3.providers.HttpProvider(config.url);
        }

        this.web3 = new Web3(this.web3Provider);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

        this.web3.eth.getAccounts((error, accts) => {
            this.metamaskAccountID = accts[0];
           
            this.owner = accts[0];

            // let counter = 1;
            
            // while(this.airlines.length < 5) {
            //     this.airlines.push(accts[counter++]);
            // }

            // while(this.passengers.length < 5) {
            //     this.passengers.push(accts[counter++]);
            // }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
                .send({ from: self.owner}, (error, result) => {
                    callback(error, payload);
                });
    }

    isAirline(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isAirline()
            .call({ from: self.metamaskAccountID }, callback);
    }

    getAirline(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getAirline(airline)
            .call({ from: self.metamaskAccountID }, callback);
    }

    getAirlineActions(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getAirline(self.metamaskAccountID)
            .call({ from: self.metamaskAccountID }, (error, result) => {
                let isAirline =  result.airline != NULL_ADDRESS;
                let isFunded = result.isFunded;
                callback(error, { isAirline: isAirline, isFunded: isFunded });
            });
    }    

    getAirlines(callback) {
        let self = this;
        self.flightSuretyData
            .getPastEvents('AirlineRegistered', {fromBlock: 0, toBLock: 'latest'}, (err, events) => {
                let results = [];
                for (let i=0; i<events.length; i++) {
                    let airline = events[i].returnValues.airline;                
                    self.getAirline(airline, async (error, result) => { 
                        result.login = result.airline == self.metamaskAccountID;
                        results.push(result);                        
                        if (i == events.length-1) { callback(error, results); }
                    });                         
                }                                    
            });        
    }

    fund(amount, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fund()
            .send({ 
                from: self.metamaskAccountID,
                value: this.web3.utils.toWei(amount, 'ether')
            }, (error, result) => {
                callback(error, result);
            });
    };

    registerAirline(airline, name, callback) {
        let self = this;        
        self.flightSuretyApp.methods
            .registerAirline(airline, name)
            .send({ 
                from: self.metamaskAccountID,
            }, (error, result) => {
                callback(error, result);
            });
    };
}