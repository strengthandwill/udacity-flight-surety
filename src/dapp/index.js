
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
        loadAirlineActions(contract);                    
        
        loadFlights(contract);
        loadFlightActions(contract);
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
        // loadAirlinesOptions(contract.airlines);            
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

// function loadAirlinesOptions(airlines) {
//     let select = DOM.elid("flight-register-airline");
//     for (let airline of airlines) {
//         select.appendChild(DOM.option({value: airline.airline}, airline.name));                
//     } 
// }

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







