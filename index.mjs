import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
import { ask, yesno } from '@reach-sh/stdlib/ask.mjs';

const stdlib = loadStdlib({ REACH_NO_WARN: 'Y' });

const startingBalance = stdlib.parseCurrency(100);

const fmt = (x) => { return ( stdlib.formatCurrency(x, 6)); }

const acc  = await stdlib.newTestAccount(startingBalance);

console.log('WELCOME TO MY NFT RAFFLE DRAW');

const main = async () => {
  const isAlice = await ask(
    `Are the organizer ?`,
    yesno
  );

  const who = isAlice ? 'The Organizer' : 'Bob';
  console.log(`Starting as ${who}`);

  let ctc = null; 

  if (isAlice){ //if deployer
    console.log("Generating the prize nft");
    const nft = await stdlib.launchToken(acc, "Pepe", "PP", {supply: stdlib.parseCurrency(1)});
    console.log("NFT generated successfuly")

    // Defining Alice's interact interface
    const Alice = {
      raffleDetails: async () => {
        const numberOfTickets =  3; 
        return [nft.id, numberOfTickets];
      },

      winningNumber: (n) => {
        const y = parseInt(n)
        console.log(y, "tickets have been generated.");
        const winningNumber =  (Math.floor(Math.random() * n) + 1);
        console.log('The lucky number is', winningNumber);
        return winningNumber;
      },

      hash: (hash) => {
        console.log('Winning number hash is', hash);
      },

      raffleWinner: (address) => {
        console.log(address, 'has won this raffle draw.')
      },

      aliceRegistry: (address, num) => {
        const y = parseInt(num)
        console.log( address, 'picked', y);
      },
    }
    
    ctc =  acc.contract(backend); 
    backend.Alice(ctc, {
      ...Alice,
      ...stdlib.hasRandom,
      nftBalance: async () => {
        console.log('Your NFT balance is ' + fmt(await stdlib.balanceOf(acc, nft.id)))
       }
    });
    const info = JSON.stringify(await ctc.getInfo()) 
    const getBalance = async () => fmt(await stdlib.balanceOf(acc, nft.id));
    const before =await getBalance()
    console.log('Your nft balance is: ' + before)
    console.log('Contract Info: ', info);
  }
  else {
    const info = await ask(
      `Please paste the contract information to connect to the raffle:`, 
      JSON.parse
    );
    ctc = acc.contract(backend, info);
    console.log('Successfully Connected')
    const enterRaffle = await ask(`Do you want to enter this raffle`, yesno)
    if(enterRaffle){
      console.log('Optining to NFT');
      console.log('You have opted in to the nft successfully.')
      const nftID = await ctc.apis.Bob.acceptNft();
      await acc.tokenAccept(nftID);
      const rafflePick = (Math.floor(Math.random() * 2) + 1);
      const [x, p]  = await ctc.apis.Bob.raffleNumber(rafflePick);
      const ip  = parseInt(p);
      await acc.tokenAccept(nftID);
      console.log('You picked the ticket with number', rafflePick);
      if(x){
        console.log('The winning number is', ip)
        console.log('Booyah You won this raffle')
      }
      else {
        console.log('The winning number is', ip)
        console.log(' Sorry you did not win ')
      }
    }
  else{
    console.log(`Exiting  the Raffle......`)
    process.exit()
  } 
    }

}

await main();
