
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        // contract.isOperational((error, result) => {
        //     display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        // }); 

        checkLoginAccount(contract);

        loadAirlines(contract);
        loadFlights(contract);
        loadInsurances(contract);
        // setTimeout(() => {  loadFlights(contract) }, 100);        
        // setTimeout(() => {  loadInsurances(contract) }, 200);

        loadAirlineActions(contract);   
        loadFlightActions(contract);
        loadInsuranceActions(contract);
    });    
})();

function checkLoginAccount(contract) {
    contract.checkLoginAirline(() => {
        DOM.elid("airline").hidden = !contract.isAirline;
        DOM.elid("airline-register").hidden = !contract.isAirlineFunded;
        DOM.elid("flight-register").hidden = !contract.isAirline;
    }); 
}

function loadAirlines(contract) {
    contract.getAirlines(() => {
        let table = DOM.elid("airlines-list");
        for (let airline of contract.airlines) { 
            let tr = airline.login ? DOM.tr({className: 'text-success'}) : DOM.tr();
            tr.appendChild(DOM.td(airline.name));
            tr.appendChild(DOM.td(airline.airline));
            tr.appendChild(DOM.td(airline.isFunded));
            tr.appendChild(DOM.td(`${airline.funds} ETH`));
            table.appendChild(tr);                
        }
    });
}

function loadAirlineActions(contract) {
    DOM.elid('airline-fund-add').addEventListener('click', () => {            
        // Write transaction    
        let amount = DOM.elid("airline-fund-amount").value;
        contract.fund(amount, (error, result) => {
            console.log(error);
            console.log(result);
        });
    }); 

    DOM.elid('airline-register-submit').addEventListener('click', () => {            
        // Write transaction    
        let name = DOM.elid("airline-register-name").value;        
        let airline = DOM.elid("airline-register-airline").value;
        
        contract.registerAirline(airline, name, (error, result) => {
            console.log(error);
            console.log(result);
        });
    });    
}

function loadFlights(contract) {
    contract.getFlights(() => {
        let table = DOM.elid("flights-list");
        for (let i=0; i<contract.flights.length; i++) { 
            let tr = DOM.tr();

            let airline = contract.flights[i].airline;
            let airline_name = contract.flights[i].airline_name;
            let flight = contract.flights[i].flight;
            let timestamp = contract.flights[i].timestamp;    
            let origin = contract.flights[i].origin;    
            let destination = contract.flights[i].destination;  
            let status = contract.flights[i].status;       

            tr.appendChild(DOM.td(airline_name));
            tr.appendChild(DOM.td(flight));
            tr.appendChild(DOM.td(timestamp));        
            tr.appendChild(DOM.td(origin));
            tr.appendChild(DOM.td(destination));
            tr.appendChild(DOM.td(status));
            
            let actionsTd = DOM.td();            
            if (contract.isAirline) {
                let checkStatusButton = DOM.button({className: 'btn btn-primary mr-3'}, 'Check Status');
                actionsTd.appendChild(checkStatusButton);

                checkStatusButton.addEventListener('click', () => { 
                    contract.fetchFlightStatus(airline, flight, timestamp, (error, result) => {                        
                        console.log(error);
                    });                                              
                }); 
            } else {
                let buyInsuranceButton = DOM.button({className: 'btn btn-primary mr-3'}, 'Buy Insurance');
                actionsTd.appendChild(buyInsuranceButton);            

                buyInsuranceButton.addEventListener('click', () => {                             
                    DOM.elid('insurance-buy-flight').innerText = `${airline_name} ${flight} at ${timestamp}, ${origin} -> ${destination}`;
                    DOM.elid('insurance-buy-flight-id').value = i.toString();
                    DOM.elid('insurance-buy').hidden = false;                
                });                                 
            }

            if (status == "Late due to Airline") {
                let claimButton = DOM.button({className: 'btn btn-primary mr-3'}, 'Claim');
                actionsTd.appendChild(claimButton);            

                claimButton.addEventListener('click', () => {                             
                    contract.payoutInsurance(airline, flight, timestamp, (error, result) => {
                        console.log(error);
                        console.log(result);
                    });
                });                                 
            }

            tr.appendChild(actionsTd);
            table.appendChild(tr);            
        }
    });
}

function loadFlightActions(contract) {
    DOM.elid('flight-register-submit').addEventListener('click', () => {            
        // Write transaction            
        let flight = DOM.elid("flight-register-flight").value;
        let timestamp = DOM.elid("flight-register-timestamp").value;
        let origin = DOM.elid("flight-register-origin").value;
        let destination = DOM.elid("flight-register-destination").value;
        
        contract.registerFlight(flight, timestamp, origin, destination, (error, result) => {
            console.log(error);
            console.log(result);
        });
    });    
}

function loadInsuranceActions(contract) {
    DOM.elid('insurance-buy-submit').addEventListener('click', () => {                            
        let name = DOM.elid("insurance-buy-name").value;        
        let i = DOM.elid("insurance-buy-flight-id").value;
        let airline = contract.flights[i].airline;
        let flight = contract.flights[i].flight;
        let timestamp = contract.flights[i].timestamp;
        let amount = DOM.elid("insurance-buy-amount").value;
        contract.buyInsurance(name, airline, flight, timestamp, amount, (error, result) => {
            console.log(error);
            console.log(result);
        });
    });    
}

function loadInsurances(contract) {
    contract.getInsurances(() => {
        let insurancesTable = DOM.elid("insurances-list");
        for (let insurance of contract.insurances) { 
            let tr = insurance.login ? DOM.tr({className: 'text-success'}) : DOM.tr();
            tr.appendChild(DOM.td(insurance.insuree_name));
            tr.appendChild(DOM.td(insurance.airline_name));
            tr.appendChild(DOM.td(insurance.flight));
            tr.appendChild(DOM.td(insurance.timestamp));
            tr.appendChild(DOM.td(insurance.origin));
            tr.appendChild(DOM.td(insurance.destination));
            tr.appendChild(DOM.td(`${insurance.paid} ETH`));
            insurancesTable.appendChild(tr);                
        }

        let insureesTable = DOM.elid("insurees-list");
        for (let i=0; i<contract.insurees.length; i++) {            
            let tr = contract.insurees[i].login ? DOM.tr({className: 'text-success'}) : DOM.tr();
            tr.appendChild(DOM.td(contract.insurees[i].name));
            tr.appendChild(DOM.td(contract.insurees[i].insuree));         
            tr.appendChild(DOM.td(`${contract.insurees[i].payout} ETH`));

            if (contract.insurees[i].login) {
                let actionsTd = DOM.td();                        
                actionsTd.appendChild(DOM.button({className: 'btn btn-primary mr-3', value: i.toString()}, 'Widthdraw'));                            
                tr.appendChild(actionsTd);
            }
            
            insureesTable.appendChild(tr);
        }
    });
}    

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}







