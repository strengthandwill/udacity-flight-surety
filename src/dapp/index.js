
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
        
        loadAirlines(contract);
        loadAirlineActions(contract);  
        
        loadFlights(contract);
        loadFlightActions(contract);
    });    
})();

function loadAirlines(contract) {
    contract.getAirlines((error, results) => {
        let table = DOM.elid("airlines-list");
        for (let result of results) { 
            let tr = result.login ? DOM.tr({className: 'text-success'}) : DOM.tr();
            tr.appendChild(DOM.td(result.name));
            tr.appendChild(DOM.td(result.airline));
            tr.appendChild(DOM.td(result.isFunded ? "Funded" : "Not funded"));
            tr.appendChild(DOM.td(`${contract.web3.utils.fromWei(result.funds, 'ether')} ETH`));
            table.appendChild(tr);                
        }
        // loadAirlinesOptions(contract.airlines);            
    });
}

function loadAirlineActions(contract) {
    contract.getAirlineActions((error, result) => {
        DOM.elid("airline").hidden = !result.isAirline;
        DOM.elid("airline-register").hidden = !result.isFunded;                             
    }); 
    
    DOM.elid('airline-fund-add').addEventListener('click', () => {            
        // Write transaction    
        let amount = DOM.elid("airline-fund-amount").value;
        contract.fund(amount, (error, result) => {
            console.log(error);
            console.log(result);
        });
    }); 

    DOM.elid('airline-register-register').addEventListener('click', () => {            
        // Write transaction    
        let name = DOM.elid("airline-register-name").value;        
        let airline = DOM.elid("airline-register-airline").value;
        
        contract.registerAirline(airline, name, (error, result) => {
            console.log(error);
            console.log(result);
        });
    });    
}

// function loadAirlinesOptions(airlines) {
//     let select = DOM.elid("flight-register-airline");
//     for (let airline of airlines) {
//         select.appendChild(DOM.option({value: airline.airline}, airline.name));                
//     } 
// }

function loadFlights(contract) {
    contract.getFlights((error, results) => {
        let table = DOM.elid("flights-list");
        for (let flight of contract.flights) { 
            let tr = DOM.tr();
            tr.appendChild(DOM.td(flight.airline_name));
            tr.appendChild(DOM.td(flight.flight));
            tr.appendChild(DOM.td(flight.timestamp));        
            tr.appendChild(DOM.td(flight.origin));
            tr.appendChild(DOM.td(flight.destination));
            tr.appendChild(DOM.td());
            tr.appendChild(DOM.td());
            table.appendChild(tr);                
        }
    });
}

function loadFlightActions(contract) {
    // contract.getAirlineActions((error, result) => {
    //     DOM.elid("airline").hidden = !result.isAirline;
    //     DOM.elid("airline-register").hidden = !result.isFunded;                             
    // });     

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







