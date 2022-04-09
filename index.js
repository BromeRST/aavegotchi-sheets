const {ethers} = require("ethers");
const abi = require("./utils/aavegotchiFacetABI.json");
const {google} = require("googleapis");
const fetch = require("cross-fetch");

const nodeCron = require("node-cron");
const moment = require("moment");

const POLYGON_KEY =
  "https://polygon-mainnet.g.alchemy.com/v2/QdzN_7dicLMlXL4E3Nhfzwh1x95abRMs";

const AAVEGOTCHI_CONTRACT_ADDRESS =
  "0x86935F11C86623deC8a25696E1C19a8659CbF95d";
const FUD_CONTRACT_ADDRESS = "0x403E967b044d4Be25170310157cB1A4Bf10bdD0f";
const FOMO_CONTRACT_ADDRESS = "0x44A6e0BE76e1D9620A7F76588e4509fE4fa8E8C8";
const ALPHA_CONTRACT_ADDRESS = "0x6a3E7C3c6EF65Ee26975b12293cA1AAD7e1dAeD2";
const KEK_CONTRACT_ADDRESS = "0x42E5E06EF5b90Fe15F853F59299Fc96259209c5C";

const abi2 = ["event Transfer(address indexed src, address indexed dst, uint val)"];

const alchemyProvider = new ethers.providers.JsonRpcProvider(POLYGON_KEY);

const contract = new ethers.Contract(AAVEGOTCHI_CONTRACT_ADDRESS, abi, alchemyProvider);
const fudContract = new ethers.Contract(FUD_CONTRACT_ADDRESS, abi2, alchemyProvider);
const fomoContract = new ethers.Contract(FOMO_CONTRACT_ADDRESS, abi2, alchemyProvider);
const alphaContract = new ethers.Contract(ALPHA_CONTRACT_ADDRESS, abi2, alchemyProvider);
const kekContract = new ethers.Contract(KEK_CONTRACT_ADDRESS, abi2, alchemyProvider);

const gotchiLended = [];

let lastTimestamp; 
let firstTimestamp;
let lastBlock;
let firstBlock;

// function to get everyday blocks
/* const getBlocks = async () => {
    lastBlock = await alchemyProvider.getBlockNumber();
    firstBlock = lastBlock - 38100;
    console.log("first", firstBlock);
    console.log("last", lastBlock);
} */

// function to get gotchi lended for an address
/* const fetchGotchiLended = async () => {
    try {
        getBlocks();
        const tx3 = await contract.getOwnerGotchiLendings(
            lendersAddresses[0],
            ethers.utils.formatBytes32String("agreed"),
            100
        );

        tx3.map((t) =>
        gotchiLended.push(
            {
            gotchiId: t.erc721TokenId,
            borrower: t.borrower,
            lender: t.lender,
            timeAgreed: t.timeAgreed,
            revenueSplit: t.revenueSplit,
            },
        ));

        console.log(gotchiLended.length);
        for (let i = 0; i < gotchiLended.length; i++) {
            main(gotchiLended[i], i+1);
        }
    } catch {
        console.log("error");
    }
}; */

// function to find block based on timestamp
const findBlockFromTimestamp = async (timestamp) => {
    const response = await fetch(
      `https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=YourApiKeyToken`
    );
    const blockNumber = await response.json();
    console.log(Number(blockNumber.result))
    return Number(blockNumber.result);
}

async function getLastBlockFromTs () {
    lastBlock = await findBlockFromTimestamp(lastTimestamp);
}

async function getFirstBlockFromTs () {
    firstBlock = await findBlockFromTimestamp(firstTimestamp);
}

// function to fetch daily FUD earn
const fetchFudBorrowerEntry = async (borrower) => {
    try {
        const filter = fudContract.filters.Transfer(null, borrower);
        const events = await fudContract.queryFilter(filter, firstBlock, lastBlock);
        let totalDailyEarn = 0;

        events.map((e) =>
            totalDailyEarn += Number(ethers.utils.formatUnits(e.args.val))
        );

        return totalDailyEarn.toFixed(0);
    } catch (err) {
        console.error(err);
    }
};

// function to fetch daily FOMO earn
const fetchFomoBorrowerEntry = async (borrower) => {
    try {
        const filter = fomoContract.filters.Transfer(null, borrower);
        const events = await fomoContract.queryFilter(filter, firstBlock, lastBlock);
        let totalDailyEarn = 0;

        events.map((e) =>
            totalDailyEarn += Number(ethers.utils.formatUnits(e.args.val))
        );

        return totalDailyEarn.toFixed(0);
    } catch {
        console.log("error");
    }
};

// function to fetch daily ALPHA earn
const fetchAlphaBorrowerEntry = async (borrower) => {
    try {
        const filter = alphaContract.filters.Transfer(null, borrower);
        const events = await alphaContract.queryFilter(filter, firstBlock, lastBlock);
        let totalDailyEarn = 0;

        events.map((e) =>
            totalDailyEarn += Number(ethers.utils.formatUnits(e.args.val))
        );

        return totalDailyEarn.toFixed(0);
    } catch {
        console.log("error");
    }
};

// function to fetch daily KEK earn
const fetchKekBorrowerEntry = async (borrower) => {
    try {
        const filter = kekContract.filters.Transfer(null, borrower);
        const events = await kekContract.queryFilter(filter, firstBlock, lastBlock);
        let totalDailyEarn = 0;

        events.map((e) =>
            totalDailyEarn += Number(ethers.utils.formatUnits(e.args.val))
        );

        return totalDailyEarn.toFixed(0);
    } catch {
        console.log("error");
    }
};

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
}); 

const spreadsheetId = "1uYSgx3UbdpmQ53QzVaqzA0HdgIg19UzDQ279y8yA_Pg";


async function main (borrower, i, column) {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});

    try {

      // Write row(s) to spreadsheet
        sheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            range: `Results April 2022!${column}${i}`,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [
                    [
                        `${await fetchFudBorrowerEntry(borrower)} / ${await fetchFomoBorrowerEntry(borrower)} / ${await fetchAlphaBorrowerEntry(borrower)} / ${await fetchKekBorrowerEntry(borrower)}`
                    ]
                ]
            }    
        })

     // Update data to spreadsheet
/*      await sheets.spreadsheets.values.update({
         auth,
         spreadsheetId,
         range: "Foglio1!A1",
         valueInputOption: "USER_ENTERED",
         resource: {
             values: [
                 ["HERE!"]
             ]
         }
     }) */


    } catch (err) {
      console.error(err);
    }
}


async function fetchDataFromSheet () {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});

    const request = { 
      auth,
      spreadsheetId,
    };

    try {
        // Read rows from spreadsheet
        const getRows = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Results April 2022!A1:A20",
        })

        return getRows.data.values
    } catch (err) {
        console.error(err);
    }
}

async function fetchDataFromSheet2 () {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});

    try {

        // Read rows from spreadsheet
        const getRows = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Results April 2022!A21:A45",
        })

        return getRows.data.values
    } catch (err) {
        console.error(err);
    }
}

const sheetsColumnsArray = ["G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK"];

async function loop (column) {
    lastTimestamp = moment().unix();
    firstTimestamp = moment().subtract(1, 'days').unix();

    const borrowerArray = await fetchDataFromSheet();
    getLastBlockFromTs();
    setTimeout(getFirstBlockFromTs, 5000)

    setTimeout(() => {
        console.log(borrowerArray)
        for (let i = 1; i < borrowerArray.length; i++) {
            main(borrowerArray[i][0], i+1, column);
        }
    }, 7000)
}

async function loop2 (column) {
    const borrowerArray = await fetchDataFromSheet2();

    console.log(borrowerArray)
    for (let i = 0; i < borrowerArray.length; i++) {
        main(borrowerArray[i][0], i+21, column)
    }
}

let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');

let i = Number(dd - 1);
let j = Number(dd - 1);

const job = nodeCron.schedule("0 01 00 * * *", function jobYouNeedToExecute() {
    console.log(i);

    if ( i <= 31) {
        loop(sheetsColumnsArray[i]);
        i ++;
    }

}, {timezone: "Etc/GMT"});

const job2 = nodeCron.schedule("0 03 00 * * *", function jobYouNeedToExecute() {
    console.log(j);

    if ( j <= 31) {
        loop2(sheetsColumnsArray[j]);
        j ++;
    }

}, {timezone: "Etc/GMT"});

// function to find block based on timestamp
/* const findBlocks = async () => {
    const response = await fetch(
      `https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=1649462340&closest=before&apikey=YourApiKeyToken`
    );
    const blockNumber = await response.json();
    console.log("BLOCK", Number(blockNumber.result))
}

findBlocks(); */