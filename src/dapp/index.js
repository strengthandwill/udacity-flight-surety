
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
    
        contract.getAirline(contract.metamaskAccountID, (error, result) => {
            if (result.airline != NULL_ADDRESS) {                                        
                DOM.elid("airlines-login-name").innerText = result.name;
                DOM.elid("airlines-login-airline").innerText = result.airline;
                DOM.elid("airlines-login-isfunded").innerText = result.isFunded ? "Funded" : "Not funded";
                DOM.elid("airlines-login-funds").innerText = `${contract.web3.utils.fromWei(result.funds, 'ether')} ETH`;     

                DOM.elid("airlines-error").hidden = true;
                DOM.elid("airlines-login").hidden = false;
                DOM.elid("airlines-fund").hidden = false;
                if (result.isFunded) { DOM.elid("airlines-register").hidden = false; }                              
            }                        
        }); 
        
        contract.getAirlines((error, results) => {
            let table = DOM.elid("airlines-table");
            for (let result of results) {  
                let tr = DOM.tr();                               
                tr.appendChild(DOM.td(result.name));
                tr.appendChild(DOM.td(result.airline));
                tr.appendChild(DOM.td(result.isFunded ? "Funded" : "Not funded"));
                tr.appendChild(DOM.td(`${contract.web3.utils.fromWei(result.funds, 'ether')} ETH`));
                table.appendChild(tr);
                console.log(`Name: ${result.name}; Airline: ${result.airline}; Funded: ${result.isFunded ? "Funded" : "Not funded"}; Funds: ${contract.web3.utils.fromWei(result.funds, 'ether')} ETH`);                           
            }            
        });
        
        DOM.elid('airlines-fund-add').addEventListener('click', () => {            
            // Write transaction    
            let amount = DOM.elid("airlines-fund-amount").value;
            contract.fund(amount, (error, result) => {
                console.log(error);
                console.log(result);
            });
        }); 

        DOM.elid('airlines-register-register').addEventListener('click', () => {            
            // Write transaction    
            let name = DOM.elid("airlines-register-name").value;        
            let airline = DOM.elid("airlines-register-airline").value;
            
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







