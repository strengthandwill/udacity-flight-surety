pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";
import "./LogHelper.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp is LogHelper {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private constant AIRLINES_THRESHOLD = 4;  
    uint256 public constant MAX_INSURANCE_COST = 1 ether;  

    uint256 public constant MINIMUM_FUNDS = 10 ether;

    address private contractOwner; // Account used to deploy contract
    bool private operational =  true; // Blocks all state changes throughout the contract if false
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;   
        uint256 timestamp;
        string origin;        
        string destination;
    }

    mapping(bytes32 => Flight) private flights;
    FlightSuretyData internal flightSuretyData;

    mapping(address => mapping(address => bool)) private airlineVoters;
    mapping(address => uint256) private airlineVotesCount;

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
        // Modify to call data contract's status
        require(operational == true, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires the caller to be a registered airline
     */
    modifier requireRegisteredAirline() {
        require(flightSuretyData.isAirline(msg.sender) == true, "Caller must be a registered airline");
        _;
    }

    /**
     * @dev Modifier that requires the caller to be a registered airline
     */
    modifier requireFundedAirline() {
        require(flightSuretyData.isAirlineFunded(msg.sender) == true, "Caller must be a funded airline");
        _;
    }   

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContract) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
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

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airline, string name)
        external        
        requireIsOperational
        requireRegisteredAirline
        requireFundedAirline
        returns (bool success, uint256 votes) {
        require(flightSuretyData.isAirline(airline) == false, "Airline is already registered");
        
        success = false;
        votes = 0;
        if (flightSuretyData.getAirlinesNum() < AIRLINES_THRESHOLD) {
            success = true;            
            flightSuretyData.registerAirline(airline, name);
        } else {
            if (airlineVoters[airline][msg.sender] == false) {
                airlineVotesCount[airline] = airlineVotesCount[airline].add(1);
                airlineVoters[airline][msg.sender] = true;
            }
            votes = airlineVotesCount[airline];
            if (votes >= flightSuretyData.getAirlinesNum() / 2) {
                success = true;
                flightSuretyData.registerAirline(airline, name);                               
            }            
        }        
        return (success, votes);
    }

    /**
     * @dev Registered airline add fund.
     *
     */
    function fund() external payable requireIsOperational requireRegisteredAirline {
        require(msg.value >= MINIMUM_FUNDS, "Not sufficient fund");
        flightSuretyData.fund.value(msg.value)(msg.sender);
    }

    /**
     * @dev Get details of airline
     *
     */
    function getAirline(address _airline) external view 
        returns (
            string name,
            address airline,
            bool isRegistered,
            bool isFunded,
            uint256 funds) {

        return flightSuretyData.getAirline(_airline);
    }   

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(string flight, uint256 timestamp, string origin, string destination) 
        external
        requireIsOperational
        requireRegisteredAirline
        requireFundedAirline { 
        require(isFlight(msg.sender, flight, timestamp) == false, "Flight is already registered");

        bytes32 key = getFlightKey(msg.sender, flight, timestamp);        
        flights[key] = Flight(
            true,
            0,
            0,            
            msg.sender,
            timestamp,
            origin,
            destination            
        );

        emit FlightRegistered(msg.sender, flight, timestamp, origin, destination);
    }

    /**
     * @dev Indicate if the flight belongs to an registered flight or not     
     *
     */
    function isFlight(address airline, string flight, uint256 timestamp) public view returns (bool) {   
        bytes32 key = getFlightKey(airline, flight, timestamp);     
        return flights[key].isRegistered;
    }

    /**
     * @dev Get the current status code and updates timestamp for a flight
     *
     */
    function getFlightStatus(address airline, string flight, uint256 timestamp) public view returns (uint256 statusCode, uint256 updatedTimestamp) {   
        bytes32 key = getFlightKey(airline, flight, timestamp);     
        return (flights[key].statusCode, flights[key].updatedTimestamp);
    }  

    /**
     * @dev Passenger buy insurance for a flight
     *
     */
    function buyInsurance(address airline, string flight, uint256 timestamp) 
        external 
        payable 
        requireIsOperational {
        
        require(flightSuretyData.isAirline(msg.sender) == false, "Airlines cannot buy flight insurance");
        require(msg.value > 0, "Value sent must be greater than 0");
        require(msg.value <= MAX_INSURANCE_COST, "Value sent exceeded the maximum allowed");
        require(isFlight(airline, flight, timestamp) == true, "Flight is not registered");
        flightSuretyData.buy.value(msg.value)(msg.sender, airline, flight, timestamp);
    }

    /**
     * @dev If flight is delayed due to airline fault, passenger receives credit
     *
     */
    function payoutInsurance(address airline, string flight, uint256 timestamp) 
        external  
        requireIsOperational {

        require(isFlight(airline, flight, timestamp) == true, "Flight is not registered");

        bytes32 key = getFlightKey(airline, flight, timestamp);
        require(flights[key].statusCode == STATUS_CODE_LATE_AIRLINE, "Flight should be delayed due to airline fault for insurance payout");

        flightSuretyData.creditInsurees(airline, flight, timestamp);
    }

    /**
     * @dev Allow insuree to withdraw the payout
     *
     */
    function withdrawPayout() 
        external  
        requireIsOperational {

        require(flightSuretyData.isInsuree(msg.sender), "Caller is not registered insuree");
        require(flightSuretyData.getInsureePayout(msg.sender) > 0, "Caller does not have insurance payout");

        flightSuretyData.pay(msg.sender);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal {
        bytes32 key = getFlightKey(airline, flight, timestamp);     
        flights[key].statusCode = statusCode;
        flights[key].updatedTimestamp = block.timestamp;
    }

    /**
     * @dev Update flight status
     *
     */
    function updateFlightStatus(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {

        processFlightStatus(airline, flight, timestamp, statusCode);        
    }    

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }    

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Event fired when new flight is registered
    event FlightRegistered(
        address indexed airline,
        string indexed flight,
        uint256 indexed timestamp,
        string origin,
        string destination
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }    

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );        
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}

// contract FlightSuretyData { 
//     function registerAirline(address account, string name) external;   
// }