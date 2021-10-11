# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder



# Tests

## flightSurety.js
![](/images/tests-flightSurety.png)

## oracles.js
![](/images/tests-oracles.png)

# Roles

## Airline
![](/images/roles-airline.png)

## Passenger
![](/images/roles-passenger.png)



# Demo
1) First airline is registered when contract is deployed
![](/images/demo1.png)

2) Airline can be registered, but does not participate in contract until it submits funding of 10 ether
![](/images/demo2.1.png)
![](/images/demo2.2.png)
![](/images/demo2.3.png)

3) Only existing airline may register a new airline until there are at least four airlines registered
![](/images/demo3.1.png)
![](/images/demo3.2.png)

4) Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines
![](/images/demo4.1.png)
![](/images/demo4.2.png)
![](/images/demo4.3.png)
![](/images/demo4.4.png)
![](/images/demo4.5.png)

5) Airline can add new flights
![](/images/demo5.1.png)
![](/images/demo5.2.png)

6) Passengers can choose from a fixed list of flight numbers and departure that are defined in the Dapp client
![](/images/demo6.png)

7) Passengers may pay up to 1 ether for purchasing flight insurance
![](/images/demo7.1.png)
![](/images/demo7.2.png)
![](/images/demo7.3.png)

8) Update flight status requests from client Dapp result in OracleRequest event emitted by Smart Contract that is captured by server (displays on console and handled in code)
![](/images/demo8.1.png)
![](/images/demo8.2.png)

9) Server will loop through all registered oracles, identify those oracles for which the OracleRequest event applies, and respond by calling into FlightSuretyApp contract with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
![](/images/demo9.png)

10) If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid
![](/images/demo10.1.png)
![](/images/demo10.2.png)
![](/images/demo10.3.png)

11) Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout
![](/images/demo11.1.png)
![](/images/demo11.2.png)