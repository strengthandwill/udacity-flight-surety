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
        address account;
        bool isRegistered;
        bool isFunded;
        uint256 funds; // this is just to control how much of the total balance the airlines are using
    }

    mapping(address => Airline) private airlines;
    uint256 internal airlinesNum = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address indexed account, string name);
    event AirlineFunded(address indexed account, uint256 funds);

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
    function registerAirline(address account, string name) external {          
        addAirline(account, name);
    }

    /**
     * @dev Register an airline 
     */
    function addAirline(address account, string memory name) private {
        airlinesNum = airlinesNum.add(1);
        airlines[account] = Airline(
            name,
            account,
            true,
            false,
            0
        );
        emit AirlineRegistered(account, name);
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
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address account) public payable {
        airlines[account].funds = airlines[account].funds.add(msg.value);
        airlines[account].isFunded = true;
        emit AirlineFunded(account, msg.value);
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
    function isAirline(address account) public view returns (bool) {
        return airlines[account].isRegistered;
    }

    /**
     * @dev Indicate if the airline is funded or not
     */
    function isFunded(address account) public view returns (bool) {
        return airlines[account].isFunded;
    }
}
