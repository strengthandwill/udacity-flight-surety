
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
        setTimeout(() => {  loadFlights(contract) }, 100);        
        setTimeout(() => {  loadInsurances(contract) }, 200);

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
            tr.appendChild(DOM.td(contract.flights[i].airline_name));
            tr.appendChild(DOM.td(contract.flights[i].flight));
            tr.appendChild(DOM.td(contract.flights[i].timestamp));        
            tr.appendChild(DOM.td(contract.flights[i].origin));
            tr.appendChild(DOM.td(contract.flights[i].destination));
            tr.appendChild(DOM.td(contract.flights[i].status));
            
            let actionsTd = DOM.td();            
            if (contract.isAirline) {
                actionsTd.appendChild(DOM.button({className: 'btn btn-primary mr-3', value: i.toString()}, 'Check Status'));                
            } else {
                let buyInsuranceButton = DOM.button({className: 'btn btn-primary mr-3'}, 'Buy Insurance');
                actionsTd.appendChild(buyInsuranceButton);            

                buyInsuranceButton.addEventListener('click', () => {                             
                    DOM.elid('insurance-buy-flight').innerText = `${contract.flights[i].airline_name} ${contract.flights[i].flight} at ${contract.flights[i].timestamp}, ${contract.flights[i].origin} -> ${contract.flights[i].destination}`;
                    DOM.elid('insurance-buy-flight-id').value = i.toString();
                    DOM.elid('insurance-buy').hidden = false;                
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
        let table = DOM.elid("insurances-list");
        for (let insurance of contract.insurances) { 
            let tr = insurance.login ? DOM.tr({className: 'text-success'}) : DOM.tr();
            tr.appendChild(DOM.td(insurance.insuree_name));
            tr.appendChild(DOM.td(insurance.airline_name));
            tr.appendChild(DOM.td(insurance.flight));
            tr.appendChild(DOM.td(insurance.timestamp));
            tr.appendChild(DOM.td(insurance.origin));
            tr.appendChild(DOM.td(insurance.destination));
            tr.appendChild(DOM.td(`${insurance.paid} ETH`));
            table.appendChild(tr);                
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







