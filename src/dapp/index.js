
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
    
        contract.getAirlineActions((error, result) => {
            console.log(result);
            DOM.elid("airline").hidden = !result.isAirline;
            DOM.elid("airline-register").hidden = !result.isFunded;

            // if (result.airline != NULL_ADDRESS) {                                        
            //     DOM.elid("airline-login-name").innerText = result.name;
            //     DOM.elid("airline-login-airline").innerText = result.airline;
            //     DOM.elid("airline-login-isfunded").innerText = result.isFunded ? "Funded" : "Not funded";
            //     DOM.elid("airline-login-funds").innerText = `${contract.web3.utils.fromWei(result.funds, 'ether')} ETH`;     
                
            //     DOM.elid("airline").hidden = false;                
            //     if (result.isFunded) { DOM.elid("airline-register").hidden = false; }                              
            // }                        
        }); 
        
        contract.getAirlines((error, results) => {
            let table = DOM.elid("airlines-list");
            for (let result of results) { 
                let tr = result.airline == contract.metamaskAccountID ? DOM.tr({className: 'text-success'}) : DOM.tr();
                tr.appendChild(DOM.td(result.name));
                tr.appendChild(DOM.td(result.airline));
                tr.appendChild(DOM.td(result.isFunded ? "Funded" : "Not funded"));
                tr.appendChild(DOM.td(`${contract.web3.utils.fromWei(result.funds, 'ether')} ETH`));
                table.appendChild(tr);                
            }            
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

        // // User-submitted transaction
        // DOM.elid('submit-oracle').addEventListener('click', () => {
        //     let flight = DOM.elid('flight-number').value;
        //     // Write transaction
        //     contract.fetchFlightStatus(flight, (error, result) => {
        //         display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
        //     });
        // });        
    });
    

})();


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







