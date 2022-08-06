'reach 0.1';
const [isOutcome, WIN, LOST] = makeEnum(2);
const outcome = (num, winningNumber) => {
  if(num == winningNumber){
    return  WIN;
  }
  else return LOST;
}
assert(outcome(1,1) == WIN )
assert(outcome(2,3) == LOST )

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: false });
  const Alice = Participant('Alice', {
    ...hasRandom,
    raffleDetails: Fun([], Tuple(Token, UInt)),
    winningNumber: Fun([UInt], UInt),
    hash: Fun([Digest], Null),
    raffleWinner: Fun([Address], Null),
    nftBalance:Fun([], Null),
    aliceRegistry: Fun([Address, UInt], Null),
    
  });
  const Bob = API('Bob', {
    raffleNumber: Fun([UInt], Tuple(Bool, UInt)),
    acceptNft: Fun([], Token),
  });
  init();

  Alice.only(() => {
    const [nft, ticketNumber] = declassify(interact.raffleDetails());
    const _winningNumber = interact.winningNumber(ticketNumber);
    const [_commitA, _saltA ] = makeCommitment(interact, _winningNumber);
    const commitA = declassify(_commitA);
    interact.hash(commitA);
  })
  Alice.publish(nft, ticketNumber, commitA);
  commit();
  Alice.pay([[1, nft]]);

  commit();

  Alice.publish();

  const register = new Map(Address, UInt);

  commit();

  Alice.only(() => {
    const winningNumber = declassify(_winningNumber);
    const saltA = declassify(_saltA);
  });

  Alice.publish(saltA, winningNumber);
  checkCommitment(commitA, saltA, winningNumber);

  const [counter] = 
    parallelReduce([ 1])
      .invariant( balance(nft) ==  balance(nft))
      .while((counter <= ticketNumber ))
      .api_(Bob.acceptNft, () => {
        check(this != Alice, "Not deployer");
        return [0, (k) => {
          k(nft);
          return [counter];
        }]
      })
      .api_(Bob.raffleNumber, (n) => {
        check(this != Alice, "Not deployer");
        return [0, (k) => {
          register[this] = n;
          Alice.interact.aliceRegistry(this, n);
          if (n == winningNumber ){
            transfer(balance(nft), nft).to(this)
            Alice.interact.raffleWinner(this);
            k([true, winningNumber]);
            return [counter + 1];
          }
          else {
            k([false, winningNumber]);
            return [counter + 1];
          }
        }]
      })
      
  commit();
  Alice.publish();
  Alice.interact.nftBalance();
  transfer(balance(nft), nft).to(Alice);
  transfer(balance()).to(Alice);
  commit();
  exit();
});