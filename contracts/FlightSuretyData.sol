pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./LogHelper.sol";

contract FlightSuretyData is LogHelper {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedCallers; // Addresses that can address this contract

    struct Airline {
        string name;
        address airline;
        bool isRegistered;
        bool isFunded;
        uint256 funds; // this is just to control how much of the total balance the airlines are using
    }

    struct Insurance {
        address insuree;  
        uint256 paid;
        address airline;
        string flight;
        uint256 timestamp;
    }   

    struct Insuree {
        bool isRegistered;
        uint256 payout;
    }

    mapping(address => Airline) private airlines;
    uint256 internal airlinesNum = 0;

    mapping(bytes32 => Insurance[]) private insurances;
    mapping(address => Insuree) private insurees;
    mapping(bytes32 => bool) private insuranceCredited;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address indexed airline, string name);
    event AirlineFunded(address indexed airline, uint256 funds);
    event InsuranceBought(address indexed insuree, uint256 paid, address airline, string flight, uint256 timestamp);    
    event InsuranceCredited(address indexed insuree, uint256 payout);    
    event InsuranceCreditAvailable(address indexed airline, string indexed flight, uint256 indexed timestamp);
    event InsurancePaid(address indexed insuree, uint256 payout);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address firstAirline, string firstAirlineName) public {
        contractOwner = msg.sender;   
        addAirline(firstAirline, firstAirlineName);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /**
     * @dev Add a new address to the list of authorized callers
     *      Can only be called by the contract owner
     */
    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        authorizedCallers[contractAddress] = true;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address airline, string name) external {          
        addAirline(airline, name);
    }

    /**
     * @dev Register an airline 
     */
    function addAirline(address airline, string memory name) private {
        airlinesNum = airlinesNum.add(1);
        airlines[airline] = Airline(
            name,
            airline,
            true,
            false,
            0
        );
        emit AirlineRegistered(airline, name);
    }

    /**
     * @dev Get number of registered airlines
     *
     */
    function getAirlinesNum() external view returns (uint256) {
        return airlinesNum;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(address passenger, address airline, string flight, uint256 timestamp) external payable {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        airlines[airline].funds = airlines[airline].funds.add(msg.value);
        insurances[key].push(Insurance(
            passenger, 
            msg.value,
            airline, 
            flight, 
            timestamp));
        insurees[passenger] = Insuree(
            true,
            0
        );
        emit InsuranceBought(passenger, msg.value, airline, flight, timestamp);
     }   

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(address airline, string flight, uint256 timestamp) external {
        require(insuranceCredited[key] == false, "Insurance has already been credited");
        bytes32 key = getFlightKey(airline, flight, timestamp);
        for (uint i=0; i < insurances[key].length; i++) {
            address insuree = insurances[key][i].insuree;
            uint256 payout = insurances[key][i].paid * 3 / 2;
            insurees[insuree].payout = insurees[insuree].payout.add(payout);
            airlines[airline].funds = airlines[airline].funds.sub(payout);
            emit InsuranceCredited(insuree, payout);                        
        }
        insuranceCredited[key] = true;
        emit InsuranceCreditAvailable(airline, flight, timestamp);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address insuree) external {
        uint256 payout = insurees[insuree].payout;
        delete(insurees[insuree]);
        insuree.transfer(payout);
        emit InsurancePaid(insuree, payout);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airline) public payable {
        airlines[airline].funds = airlines[airline].funds.add(msg.value);
        airlines[airline].isFunded = true;
        emit AirlineFunded(airline, msg.value);
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        require(msg.data.length == 0, "Message data should be empty");
        require(isAirline(msg.sender), "Caller must be a registered airline");        
        fund(msg.sender);
    }

    /**
     * @dev Indicate if the address belongs to an registered airline or not
     */
    function isAirline(address airline) public view returns (bool) {
        return airlines[airline].isRegistered;
    }

    /**
     * @dev Indicate if the airline is funded or not
     */
    function isAirlineFunded(address airline) public view returns (bool) {
        return airlines[airline].isFunded;
    }

    /**
     * @dev Get funds of the airline
     */
    function getAirlineFunds(address airline) public view returns (uint256) {
        return airlines[airline].funds;
    }    

    /**
     * @dev Indicate if the passenger has bought insurance for a flight or not     
     *
     */
    function isInsuranceBought(address passenger, address airline, string flight, uint256 timestamp) public view returns (bool) {           
        bytes32 key = getFlightKey(airline, flight, timestamp);        
        for (uint i=0; i < insurances[key].length; i++) {
            if (insurances[key][i].insuree == passenger) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Indicate if the address belongs to an registered insuree or not
     */
    function isInsuree(address insuree) public view returns (bool) {
        return insurees[insuree].isRegistered;
    }     

    /**
     * @dev Get funds of the airline
     */
    function getInsureePayout(address insuree) public view returns (uint256) {
        return insurees[insuree].payout;
    } 
}
