import { useEffect, useState } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

import kp from "./keypair.json";

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";

import idl from "./idl.json";

// Web3 Constants

// References solana runtime
const { SystemProgram } = web3;

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Our specifric program id
const programID = new PublicKey(idl.metadata.address);

// network
const network = clusterApiUrl("devnet");

// controls how we want to acknowledge when a transaction is "done"
const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "billyjacoby";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [linkValue, setLinkValue] = useState("");
  const [userNameValue, setUserNameValue] = useState("");
  const [gifList, setGifList] = useState([]);

  function getProvider() {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );

    return provider;
  }

  async function createGifAccount() {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping!");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        "Created a new BaseAccount w/ address: ",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account: ", error);
    }
  }

  async function getGifList() {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );
      //* Only displays actual gifs!
      async function filterGifs() {
        let gifs = [];
        for (let gif of account.gifList) {
          try {
            let res = fetch(gif.gifLink);
            let isGif = (await res).headers.get("Content-Type") === "image/gif";
            console.log(gif);
            if (isGif) gifs.push(gif);
          } catch (error) {
            console.log("unable to fetch gif link: ", gif.gifLink);
          }
        }

        return gifs;
      }
      let newGifs = await filterGifs();
      setGifList(newGifs);
    } catch (error) {
      console.log("Error in getGifs: ", error);
      setGifList(null);
    }
  }

  async function sendGif() {
    //TODO: Add URL verification here
    if (linkValue.length === 0) {
      console.log("No gif link given!");
      return;
    }

    try {
      let res = await fetch(linkValue);
      let isGif = res.headers.get("Content-Type") === "image/gif";
      if (isGif) {
        try {
          const provider = getProvider();
          const program = new Program(idl, programID, provider);

          await program.rpc.addGif(linkValue, userNameValue, {
            accounts: {
              baseAccount: baseAccount.publicKey,
              user: provider.wallet.publicKey,
            },
          });

          console.log("GIF successfully sent to program", linkValue);

          await getGifList();
        } catch (error) {
          console.log("Error sending GIF:", error);
        }
      } else {
        alert("Please make sure you enter the URL of a GIF!");
      }
    } catch (error) {
      console.log("Error, unable to add gif. Error.name:", error.name);
    }
    console.log("Gif link: ", linkValue);
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key: ", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this it means that the program account has not been initialized
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time initialization for GIF Program Account
          </button>
        </div>
      );
    } else {
      return (
        <div className="connected-container">
          <input
            type="text"
            placeholder="Enter GIF link!"
            value={linkValue}
            onChange={(e) => setLinkValue((prev) => e.target.value)}
          />
          <br />
          <input
            type="text"
            className="user-name"
            placeholder="Enter an (optional) name!"
            value={userNameValue}
            onChange={(e) => setUserNameValue(e.target.value)}
          />
          <button className="cta-button submit-gif-button" onClick={sendGif}>
            Submit
          </button>
          <div className="gif-grid">
            {gifList.map((gif) => {
              return (
                <div className="gif-item" key={gif.gifLink}>
                  <h3 style={{ color: "white" }}>Submitted by:</h3>
                  <p style={{ color: "white" }}>
                    {(gif.userName !== "userName" && gif.userName) ||
                      gif.userAddress.toString()}
                  </p>
                  <img src={gif.gifLink} alt={gif} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    window.addEventListener("load", async (event) => {
      await checkIfWalletIsConnected();
    });
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");

      // Call program to get GIF list here

      // Set the gif list state
      getGifList();
    }
  }, [walletAddress]);
  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
