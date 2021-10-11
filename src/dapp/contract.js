import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.airlines = [];
        this.flights = [];        
        this.insurances = [];
        this.insurees = [];
        
        this.loginAccount = null;
        this.isAirline = false;
        this.isAirlineFunded = false;

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
            this.loginAccount = accts[0];
            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;         
        self.flightSuretyApp.methods
            .fetchFlightStatus(airline, flight, timestamp)
                .send({ from: self.loginAccount }, (error, result) => {
                    callback(error, result);
                });
    }

    isAirline(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isAirline()
            .call({ from: self.loginAccount }, callback);
    }

    getAirline(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getAirline(airline)
            .call({ from: self.loginAccount }, callback);
    }

    checkLoginAirline(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getAirline(self.loginAccount)
            .call({ from: self.loginAccount }, (error, result) => {
                self.isAirline = result.airline != NULL_ADDRESS;
                self.isAirlineFunded = result.isFunded;
                callback();
            });
    }    

    getAirlines(callback) {
        let self = this;
        self.flightSuretyData
            .getPastEvents('AirlineRegistered', {fromBlock: 0, toBLock: 'latest'}, (error, events) => {
                for (let i=0; i<events.length; i++) {
                    let airline = events[i].returnValues.airline;                
                    self.getAirline(airline, async (error, result) => {           
                        self.airlines.push({
                            login: self.loginAccount == result.airline,
                            name: result.name,                            
                            airline: result.airline,
                            isFunded: result.isFunded ? "Funded" : "Not funded",
                            funds: self.web3.utils.fromWei(result.funds, 'ether')
                        });                        
                        if (i == events.length-1) { callback(); }
                    });                         
                }                                    
            });        
    }

    getAirlineName(address) {
        for (let airline of this.airlines) {
            if (airline.airline == address) {
                return airline.name;
            }
        }
        return null;
    }

    fund(amount, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fund()
            .send({ 
                from: self.loginAccount,
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
                from: self.loginAccount,
            }, (error, result) => {
                callback(error, result);
            });
    };

    getFlights(callback) {
        let self = this;
        self.flightSuretyApp
            .getPastEvents('FlightRegistered', {fromBlock: 0, toBLock: 'latest'}, (error, events) => {
                for (let i=0; i<events.length; i++) {                    
                    let airline = events[i].returnValues.airline;
                    let flight = events[i].returnValues.flight;
                    let timestamp = events[i].returnValues.timestamp;
                    self.getFlightStatus(airline, flight, timestamp, async (error, result) => {                                                
                        self.flights.push({
                            airline: airline,
                            airline_name: self.getAirlineName(airline),
                            flight: flight,
                            timestamp: timestamp,
                            origin: events[i].returnValues.origin,
                            destination: events[i].returnValues.destination,
                            status: self.getFlightStatusDesc(result.statusCode)
                        });
                        if (i == events.length-1) { callback(); }
                    });                         
                }                                    
            });        
    }   
    
    registerFlight(flight, timestamp, origin, destination, name, callback) {
        let self = this;    
        self.flightSuretyApp.methods
            .registerFlight(flight, timestamp, origin, destination)
            .send({ 
                from: self.loginAccount
            }, (error, result) => {
                callback(error, result);
            });
    };

    getFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getFlightStatus(airline, flight, timestamp)
            .call({ from: self.loginAccount }, callback);
    }
    
    getFlightStatusDesc(statusCode) {
        let status = "Unknown";
        switch (parseInt(statusCode)) {
            case STATUS_CODE_UNKNOWN: 
                status = "Unknown";
                break;
            case STATUS_CODE_ON_TIME:
                status = "On Time";
                break;            
            case STATUS_CODE_LATE_AIRLINE:
                status = "Late due to Airline";
                break;            
            case STATUS_CODE_LATE_WEATHER:
                status = "Late due to Weather";
                break;            
            case STATUS_CODE_LATE_TECHNICAL:
                status = "Late due to Technical";
                break;            
            case STATUS_CODE_LATE_OTHER:
                status = "Late due to Other";
                break;            
        }
        return status;
    }

    buyInsurance(name, airline, flight, timestamp, amount, callback) {
        let self = this;    
        self.flightSuretyApp.methods
            .buyInsurance(name, airline, flight, timestamp)
            .send({ 
                from: self.loginAccount,
                value: this.web3.utils.toWei(amount, 'ether')
            }, (error, result) => {
                alert(error);
                callback(error, result);
            });
    };

    getFlightInfo(airline, flight, timestamp) {
        for (let flightEle of this.flights) {            
            if (flightEle.airline == airline && flightEle.flight == flight && flightEle.timestamp == timestamp) {
                return { origin: flightEle.origin, destination: flightEle.destination };
            }
        }
        return null;
    }

    getInsuree(insuree, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getInsuree(insuree)
            .call({ from: self.loginAccount }, callback);
    }    

    getInsurances(callback) {
        let self = this;
        self.flightSuretyData
            .getPastEvents('InsuranceBought', {fromBlock: 0, toBLock: 'latest'}, (error, events) => {                                
                for (let i=0; i<events.length; i++) {
                    let insuree = events[i].returnValues.insuree;
                    console.log(insuree);
                    self.getInsuree(insuree, async (error, result) => {                                                                        
                        self.insurees.push({
                            login: self.loginAccount == insuree,
                            insuree: insuree,
                            name: result.name,
                            isRegistered: result.isRegistered,
                            payout: result.payout,
                        });

                        let airline = events[i].returnValues.airline;
                        let flight = events[i].returnValues.flight;
                        let timestamp = events[i].returnValues.timestamp;
                        let flightInfo = self.getFlightInfo(airline, flight, timestamp);
                        self.insurances.push({
                            login: self.loginAccount == insuree,
                            insuree: insuree,
                            insuree_name: result.name,                            
                            paid: self.web3.utils.fromWei(events[i].returnValues.paid, 'ether'),
                            airline: airline,
                            airline_name: this.getAirlineName(airline),
                            flight: flight,
                            timestamp: timestamp,
                            origin: flightInfo.origin,
                            destination: flightInfo.destination                           
                        });  
                                                                  
                        if (i == events.length-1) { callback(); }                                        
                    });
                }                                    
            });        
    }
}